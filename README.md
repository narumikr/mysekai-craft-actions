![Hello-SEKAI](https://capsule-render.vercel.app/api?type=waving&height=250&color=0:99ccff,100:ddaacc&text=Hello%20SEKAI&section=header&reversal=false&fontColor=f5f5f7&fontSize=50&animation=fadeIn&desc=Grow%20up%20MYSEKAI%20Actions&descSize=0&fontAlign=45&fontAlignY=40&descAlign=65&descAlignY=55)

# **_mysekai-craft-actions_**

![welcome comment](https://readme-typing-svg.herokuapp.com?color=%2300bbdd&width=500&lines=Hello+there!!+Thanks+for+stopping+by+🎵;Welcome+to+my+SEKAI+💫;Just+showing+big+love+for+prsk+💚)

<img src="https://img.shields.io/badge/License-Fan_made-lightgreen" alt="License: Fan-made" />

### 💫 **_Behind the Scenes_** 💫![Leo/need-divider](https://capsule-render.vercel.app/api?type=rect&height=2&color=0:3367cc,100:f5f5f7)

日常に推し、プロセカキャラと過ごせるリアルマイセカイを。

### 🎤 **_What we provide_** 🎤![VIVID-BAD-SQUAD-divider](https://capsule-render.vercel.app/api?type=rect&height=2&color=0:ee1166,100:f5f5f7)


### **prsk-birthday**

指定したDiscordのテキストチャンネルに、プロセカキャラクターの誕生日を自動でお知らせしてくれます

#### **Feature**

- **誕生日の自動通知** : スケジュール実行された日付とキャラクターの誕生日を照合し、該当するキャラクターをDiscordへ通知します
- **事前通知** : 当日だけでなく、`notice-days-before`で指定した日数前にもお知らせできます（例: `7,3,0`）
- **タイムゾーン指定** : `timezone`で判定に使う日付のタイムゾーンを指定できます（デフォルトは`Asia/Tokyo`）
- **キャラクターの絞り込み** : `character-keys`で通知したい推しキャラだけに限定できます

#### 事前準備

1. Discordで通知したいテキストチャンネルを開き、`チャンネルの編集` → `連携サービス` → `ウェブフックを作成` からWebhook URLを取得します
2. 取得したURLを、リポジトリの `Settings` → `Secrets and variables` → `Actions` に `DISCORD_WEBHOOK` として登録します


### 🎪 **_How to use_** 🎪![WONDERLANDS-SHOWTIME-divider](https://capsule-render.vercel.app/api?type=rect&height=2&color=0:ff9900,100:f5f5f7)

#### リポジトリへのワークフロー追加

リポジトリの `.github/workflows/` ディレクトリに以下のようなワークフローファイルを作成します：

**prsk-birthday**

```yaml
name: prsk birthday notice

on:
  schedule:
    # 毎日 00:00 JST (前日 15:00 UTC)
    - cron: '0 15 * * *'
  workflow_dispatch:

jobs:
  notice-birthday:
    runs-on: ubuntu-latest
    steps:
      - name: Notice birthday
        uses: narumikr/mysekai-craft-actions/prsk-birthday@v1
        with:
          discord-webhook: ${{ secrets.DISCORD_WEBHOOK }}
          notice-days-before: '7,3,0'
          # 日付の判定に使うタイムゾーン（未指定なら Asia/Tokyo）
          # timezone: 'Asia/Tokyo'
          # 通知したい推しキャラだけに絞る（未指定なら全キャラ）
          # 指定できるキーは common/prsk-profile.constants.json を参照
          # character-keys: 'miku,ichika,kanade'
          # Webhookの表示名（未指定なら プロセカ誕生日おしらせ）
          # webhook-username: 'プロセカ誕生日おしらせ'
```

> [!note]
> `@v1`の部分には、利用したいバージョンタグを指定してください（例: `@v1`, `@v1.0.0`など）。最新のリリースバージョンは[Releases](https://github.com/narumikr/mysekai-craft-actions/releases)ページで確認できます。

**※ ファンメイド作品です**

私の大好きなプロセカという作品、でもイラストは描けない、書き物や工作なども難しい。
でも何かしら創作をしたいという想いから作り始めました💫

**※本リポジトリはプロセカ公式とは一切関係ありません**
