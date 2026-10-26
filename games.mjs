export const DEFAULT_GAMES = Object.freeze([
  '猜拳对决｜选一位朋友，三局两胜，输的人记 1 杯。',
  '逢七过｜从你开始轮流报数，遇到 7 或 7 的倍数拍手，出错的人记 1 杯。',
  '骰子比大小｜你和左边的人各掷一次骰子，点数小的记 1 杯，相同就重来。',
  '猜单双｜右边的人心里选一个 1–10 的数字，你猜单双，猜错记 1 杯。',
  '反口令｜左边的人说左右，你要指向相反方向，连续做五次，出错记 1 杯。',
  '水果接龙｜从你开始，每人说一种水果，不能重复，卡住的人记 1 杯。',
  '歌词接龙｜你先唱一句，下一位接一句带相同字的歌词，接不上记 1 杯。',
  '数到三十｜轮流接着报 1–3 个数，说到 30 的人记 1 杯。',
  '动作传递｜你做一个动作，下一位重复并加一个，记错顺序的人记 1 杯。',
  '禁词一分钟｜本轮不能说“我”，从你开始聊天，第一个说出口的人记 1 杯。',
  '你画我猜｜用手比划一种动物，让右边的人猜，猜对对方记 1 杯，猜错你记 1 杯。',
  '倒着说｜左边的人给一个四字词，你把它倒着说，出错记 1 杯。',
  '拍手逢三｜从你开始报数，3 的倍数只拍手不出声，出错的人记 1 杯。',
  '默契选择｜你和一位朋友同时说出一种颜色，不同各记 1 杯，相同过关。',
  '记忆清单｜从你开始说“我带了…”，每人复述已有物品再加一种，漏掉记 1 杯。',
  '猜拳守擂｜选一位朋友猜拳一局，输的人记 1 杯，赢的人选下一位对手。',
]);

export function validateGames(games) {
  if (!Array.isArray(games) || games.length < 1 || games.length > 100 ||
      games.some(game => typeof game !== 'string' || !game.trim() || game.length > 300) ||
      new Set(games).size !== games.length) {
    throw Error('请填写 1–100 个不重复的题目，每题不超过 300 字');
  }
  return games;
}

export function parseGames(text) {
  return validateGames([...new Set(text.split(/\r?\n/).map(line => line.trim()).filter(Boolean))]);
}

export function pickGame(games, previous, random = Math.random) {
  validateGames(games);
  const choices = games.length > 1 ? games.filter(game => game !== previous) : games;
  const value = random();
  if (!(value >= 0 && value < 1)) throw Error('随机数无效，请重试');
  return choices[Math.floor(value * choices.length)];
}
