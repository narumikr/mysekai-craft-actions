/**
 * Birthday Notifier for Project SEKAI
 */

const fs = require('fs');
const path = require('path');

// Constants
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_EMBEDS_PER_MESSAGE = 10;
const DEFAULT_EMBED_COLOR = 0x5865f2;
const MAX_DAYS_BEFORE = 365;

// Load character profiles from the shared JSON file
function loadProfiles(actionPath) {
  const profilePath = path.join(actionPath, '..', 'common', 'prsk-profile.constants.json');
  try {
    return JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
  } catch (err) {
    throw new Error(`Failed to load profiles (profilePath: ${profilePath}): ${err.message}`);
  }
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

// Resolve the calendar date of `now` in the given timezone
function getDateParts(now, timeZone) {
  let parts;
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
  } catch (err) {
    throw new Error(`Invalid timezone: ${timeZone}`);
  }

  const picked = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      picked[part.type] = Number(part.value);
    }
  }
  return { year: picked.year, month: picked.month, day: picked.day };
}

// MM-DD of the day that comes `daysBefore` days after today
function resolveTargetMonthDay(now, timeZone, daysBefore) {
  const { year, month, day } = getDateParts(now, timeZone);
  const target = new Date(Date.UTC(year, month - 1, day) + daysBefore * MS_PER_DAY);
  return `${pad2(target.getUTCMonth() + 1)}-${pad2(target.getUTCDate())}`;
}

// "08-31" -> "8月31日"
function formatMonthDayJa(monthDay) {
  const matched = /^(\d{2})-(\d{2})$/.exec(monthDay ?? '');
  if (!matched) {
    return String(monthDay ?? '');
  }
  return `${Number(matched[1])}月${Number(matched[2])}日`;
}

// "7, 3, 0" -> [0, 3, 7]
function parseDaysBefore(input) {
  const values = String(input ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (values.length === 0) {
    return [0];
  }

  const days = values.map((value) => {
    if (!/^\d+$/.test(value)) {
      throw new Error(`notice-days-before must be a comma separated list of non-negative integers. Got: ${value}`);
    }
    const day = Number(value);
    if (day > MAX_DAYS_BEFORE) {
      throw new Error(`notice-days-before must be ${MAX_DAYS_BEFORE} or less. Got: ${day}`);
    }
    return day;
  });

  return [...new Set(days)].sort((a, b) => a - b);
}

// "miku, rin" -> ['miku', 'rin'] (empty means every character)
function parseCharacterKeys(input, profiles) {
  const keys = String(input ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (keys.length === 0) {
    return Object.keys(profiles);
  }

  const unknown = keys.filter((key) => !profiles[key]);
  if (unknown.length > 0) {
    throw new Error(`Unknown character-keys: ${unknown.join(', ')}`);
  }
  return [...new Set(keys)];
}

// Find characters to notify, sorted by the closest birthday first
function findBirthdays(profiles, { now, timeZone, daysBeforeList, characterKeys }) {
  const entries = [];

  for (const daysBefore of daysBeforeList) {
    const monthDay = resolveTargetMonthDay(now, timeZone, daysBefore);
    for (const key of characterKeys) {
      const character = profiles[key];
      if (character && character.birthday === monthDay) {
        entries.push({ key, character, daysBefore, monthDay });
      }
    }
  }

  return entries;
}

function hexToColor(hex) {
  const color = Number.parseInt(String(hex ?? '').replace(/^#/, ''), 16);
  return Number.isNaN(color) ? DEFAULT_EMBED_COLOR : color;
}

function buildHeadline({ character, daysBefore }) {
  if (daysBefore === 0) {
    return `🎉 今日は ${character.icon} ${character.name} の誕生日です！`;
  }
  return `⏳ あと${daysBefore}日で ${character.icon} ${character.name} の誕生日です！`;
}

function buildEmbed(entry) {
  const { character, daysBefore } = entry;
  return {
    title: `${character.icon} ${character.name}`,
    description:
      daysBefore === 0
        ? 'お誕生日おめでとう🎂 今日はたくさんお祝いしよう💫'
        : `誕生日まであと${daysBefore}日です。お祝いの準備をはじめましょう💫`,
    color: hexToColor(character.color),
    fields: [{ name: '誕生日', value: formatMonthDayJa(character.birthday), inline: true }],
  };
}

// Discord accepts up to 10 embeds per message, so split entries into chunks
function buildPayloads(entries, { username, mention }) {
  const payloads = [];

  for (let index = 0; index < entries.length; index += MAX_EMBEDS_PER_MESSAGE) {
    const chunk = entries.slice(index, index + MAX_EMBEDS_PER_MESSAGE);
    const content = [mention, ...chunk.map(buildHeadline)].filter(Boolean).join('\n');

    payloads.push({
      username,
      content,
      embeds: chunk.map(buildEmbed),
      allowed_mentions: { parse: ['roles', 'users'] },
    });
  }

  return payloads;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Post a single message, retrying once when Discord rate limits us
async function postToDiscord(webhookUrl, payload, { fetchImpl = fetch, retryOnRateLimit = true } = {}) {
  const response = await fetchImpl(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (response.status === 429 && retryOnRateLimit) {
    const body = await response.json().catch(() => ({}));
    const waitSeconds = Number(body.retry_after) || 1;
    console.log(`Rate limited by Discord. Retrying in ${waitSeconds}s...`);
    await sleep(waitSeconds * 1000);
    return postToDiscord(webhookUrl, payload, { fetchImpl, retryOnRateLimit: false });
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Discord webhook responded with ${response.status}: ${body}`);
  }
}

async function sendNotifications(webhookUrl, payloads, { dryRun = false, fetchImpl = fetch } = {}) {
  for (const payload of payloads) {
    if (dryRun) {
      console.log(`[dry-run] ${JSON.stringify(payload)}`);
      continue;
    }
    await postToDiscord(webhookUrl, payload, { fetchImpl });
  }
}

module.exports = {
  MAX_EMBEDS_PER_MESSAGE,
  loadProfiles,
  getDateParts,
  resolveTargetMonthDay,
  formatMonthDayJa,
  parseDaysBefore,
  parseCharacterKeys,
  findBirthdays,
  hexToColor,
  buildHeadline,
  buildEmbed,
  buildPayloads,
  postToDiscord,
  sendNotifications,
};
