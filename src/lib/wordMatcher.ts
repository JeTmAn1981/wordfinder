export type CleanWord = {
  original: string;
  value: string;
};

export type MatchConfig = {
  firstLength: number;
  firstPosition: number;
  secondLength: number;
  secondPosition: number;
};

export type LinkedWordRule = {
  id: string;
  length: number;
  anchorPosition: number;
  wordPosition: number;
};

export type MultiMatchConfig = {
  anchorLength: number;
  rules: LinkedWordRule[];
  maxResults?: number;
};

export type WordPair = {
  first: CleanWord;
  second: CleanWord;
  sharedLetter: string;
};

export type LinkedWordMatch = {
  rule: LinkedWordRule;
  word: CleanWord;
  sharedLetter: string;
};

export type WordMatchGroup = {
  anchor: CleanWord;
  matches: LinkedWordMatch[];
};

export type MultiMatchResult = {
  groups: WordMatchGroup[];
  truncated: boolean;
};

export function normalizeWord(input: string): string {
  return input.replace(/[^a-z]/gi, "").toLowerCase();
}

export function parseWordList(input: string): CleanWord[] {
  const seen = new Set<string>();

  return input
    .split(/\r?\n/)
    .map((line) => ({ original: line.trim(), value: normalizeWord(line) }))
    .filter((word) => word.value.length > 0)
    .filter((word) => {
      if (seen.has(word.value)) {
        return false;
      }

      seen.add(word.value);
      return true;
    });
}

export function findMatchingPairs(words: CleanWord[], config: MatchConfig): WordPair[] {
  const firstCandidates = words.filter((word) => word.value.length === config.firstLength);
  const secondCandidates = words.filter((word) => word.value.length === config.secondLength);

  const pairs: WordPair[] = [];

  for (const first of firstCandidates) {
    const firstLetter = first.value[config.firstPosition - 1];

    for (const second of secondCandidates) {
      if (first.value === second.value) {
        continue;
      }

      const secondLetter = second.value[config.secondPosition - 1];

      if (firstLetter === secondLetter) {
        pairs.push({ first, second, sharedLetter: firstLetter });
      }
    }
  }

  return pairs;
}

export function findMatchingGroups(words: CleanWord[], config: MultiMatchConfig): MultiMatchResult {
  const maxResults = config.maxResults ?? 5_000;
  const anchors = words.filter((word) => word.value.length === config.anchorLength);
  const groups: WordMatchGroup[] = [];

  if (config.rules.length === 0) {
    return { groups: anchors.map((anchor) => ({ anchor, matches: [] })), truncated: false };
  }

  for (const anchor of anchors) {
    const candidatesByRule = config.rules.map((rule) => {
      const sharedLetter = anchor.value[rule.anchorPosition - 1];

      return words
        .filter((word) => word.value.length === rule.length)
        .filter((word) => word.value !== anchor.value)
        .filter((word) => word.value[rule.wordPosition - 1] === sharedLetter)
        .map((word) => ({ rule, word, sharedLetter }));
    });

    if (candidatesByRule.some((candidates) => candidates.length === 0)) {
      continue;
    }

    const usedWords = new Set<string>([anchor.value]);
    const currentMatches: LinkedWordMatch[] = [];

    const buildGroups = (ruleIndex: number): boolean => {
      if (ruleIndex === candidatesByRule.length) {
        groups.push({ anchor, matches: [...currentMatches] });
        return groups.length >= maxResults;
      }

      for (const candidate of candidatesByRule[ruleIndex]) {
        if (usedWords.has(candidate.word.value)) {
          continue;
        }

        usedWords.add(candidate.word.value);
        currentMatches.push(candidate);

        if (buildGroups(ruleIndex + 1)) {
          return true;
        }

        currentMatches.pop();
        usedWords.delete(candidate.word.value);
      }

      return false;
    };

    if (buildGroups(0)) {
      return { groups, truncated: true };
    }
  }

  return { groups, truncated: false };
}
