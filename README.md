# anpi-fuso PWA

Glideで作成した安否確認アプリ試作品を、標準的なWeb技術でPWA化するための初期実装です。

## 現在の範囲

- Glide版に近いピンク基調の利用者画面
- 入力画面
- 入力者名ごとの最新1件リスト
- 詳細画面
- 本人/保護者の安否集計
- 本人/保護者の現在地集計
- 端末内 `localStorage` への保存とSupabase同期
- PWA manifest と service worker

## 開発

Node.js 20.19 以上を使います。

```bash
npm install
npm run dev
```

## 次に足すもの

- Google Sheets / API 連携
- 管理者ログイン
- 管理画面
- CSVエクスポート

## サーバー同期

[接続設定・同期の動作・検証手順](SUPABASE_SETUP.md)を参照してください。
`npm test` で同期処理を検証できます。
