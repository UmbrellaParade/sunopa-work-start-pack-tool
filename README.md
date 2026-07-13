# Sunoパ！作業開始パックツール

Sunoパ！の記事作成、音源整理、SE_Pon登録、サムネ制作、SNS導線をCodexに依頼するときの「作業開始パック」を生成するためのツール案です。

GitHub repository:

```text
https://github.com/UmbrellaParade/sunopa-work-start-pack-tool
```

## 目的

毎回Codexへ渡す情報を固定化し、次の作業をスムーズに進める。

- ゲスト回アーカイブ記事
- リスナー応募楽曲オンエアーアーカイブ記事
- フォーム音源の保存
- SE_Ponの `🎵 放送「曲・BGM」` 登録
- 全曲リピートON確認
- 楽曲紹介用16:9サムネの制作指示
- WordPress下書き、SNS投稿文、告知漫画案

## まず作るもの

最初は完全自動化ではなく、Codexへ渡すテキスト生成を優先します。

```text
1. 放送回を選ぶ
2. 記事タイプを選ぶ
3. 作業範囲をチェックする
4. 音源保存先を表示する
5. SE_Pon登録順を表示する
6. 作業後チェックリストを表示する
7. Codex作業開始パックをコピーする
```

## 関連資料

詳細な設計指示は [docs/design-instructions.md](docs/design-instructions.md) を参照。

元の運用資料はローカルObsidianフォルダーにあります。

```text
C:\Users\myabe\OneDrive\Desktop\Obsidian Folder\Umbrella Parade\Sunoパ！記事
```
