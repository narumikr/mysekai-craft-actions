/**
 * Entry point for the prsk-birthday composite action
 */

const fs = require('fs');
const {
  loadProfiles,
  parseDaysBefore,
  parseCharacterKeys,
  findBirthdays,
  buildPayloads,
  sendNotifications,
} = require('./prsk-birthday-notice.js');

const DEFAULT_TIMEZONE = 'Asia/Tokyo';
const DEFAULT_WEBHOOK_USERNAME = 'プロセカ誕生日おしらせ';

function setOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return;
  }
  fs.appendFileSync(outputPath, `${name}=${value}\n`);
}

function isTrue(value) {
  return String(value ?? '').trim().toLowerCase() === 'true';
}

async function main() {
  const actionPath = process.env.ACTION_PATH || __dirname;
  const webhookUrl = (process.env.DISCORD_WEBHOOK || '').trim();
  const dryRun = isTrue(process.env.DRY_RUN);

  if (!webhookUrl && !dryRun) {
    throw new Error('discord-webhook is required');
  }

  const profiles = loadProfiles(actionPath);
  const daysBeforeList = parseDaysBefore(process.env.NOTICE_DAYS_BEFORE);
  const characterKeys = parseCharacterKeys(process.env.CHARACTER_KEYS, profiles);
  const timeZone = (process.env.TIMEZONE || '').trim() || DEFAULT_TIMEZONE;

  const entries = findBirthdays(profiles, {
    now: new Date(),
    timeZone,
    daysBeforeList,
    characterKeys,
  });

  console.log(`Timezone: ${timeZone}`);
  console.log(`Days before: ${daysBeforeList.join(', ')}`);
  console.log(`Matched characters: ${entries.length}`);

  setOutput('count', String(entries.length));
  setOutput(
    'notified',
    JSON.stringify(entries.map(({ key, character, daysBefore }) => ({ key, name: character.name, daysBefore })))
  );

  if (entries.length === 0) {
    console.log('No birthday to notice today.');
    return;
  }

  for (const { character, daysBefore } of entries) {
    console.log(`- ${character.name} (${character.birthday}) / ${daysBefore} days before`);
  }

  const payloads = buildPayloads(entries, {
    username: (process.env.WEBHOOK_USERNAME || '').trim() || DEFAULT_WEBHOOK_USERNAME,
    mention: (process.env.MENTION || '').trim(),
  });

  await sendNotifications(webhookUrl, payloads, { dryRun });

  console.log(dryRun ? '✅ Dry run finished.' : `✅ Sent ${payloads.length} message(s) to Discord.`);
}

main().catch((err) => {
  console.error(`::error::${err.message}`);
  process.exit(1);
});
