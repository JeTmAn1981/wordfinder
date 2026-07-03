import { describe, expect, it } from "vitest";
import { findMatchingGroups, findMatchingPairs, parseWordList } from "./wordMatcher";

describe("parseWordList", () => {
  it("strips non-letters and removes duplicate normalized words", () => {
    expect(parseWordList("apple\nco-op\nco op\n123\nBee!")).toEqual([
      { original: "apple", value: "apple" },
      { original: "co-op", value: "coop" },
      { original: "Bee!", value: "bee" },
    ]);
  });
});

describe("findMatchingPairs", () => {
  it("matches configured positions across configured lengths", () => {
    const words = parseWordList("stare\nbrisket\notter\nstation\nelope");
    const pairs = findMatchingPairs(words, {
      firstLength: 5,
      firstPosition: 2,
      secondLength: 7,
      secondPosition: 7,
    });

    expect(pairs.map((pair) => [pair.first.value, pair.second.value])).toEqual([
      ["stare", "brisket"],
      ["otter", "brisket"],
    ]);
  });
});

describe("findMatchingGroups", () => {
  it("matches multiple words against a single anchor word", () => {
    const words = parseWordList("notebook\nbackseat\novercast\nkernel\nsounder\nnotebook");
    const result = findMatchingGroups(words, {
      anchorLength: 8,
      rules: [
        { id: "ending", length: 8, anchorPosition: 3, wordPosition: 8 },
        { id: "opening", length: 8, anchorPosition: 6, wordPosition: 1 },
        { id: "short", length: 6, anchorPosition: 8, wordPosition: 1 },
      ],
    });

    expect(result.truncated).toBe(false);
    expect(
      result.groups.map((group) => [
        group.anchor.value,
        ...group.matches.map((match) => match.word.value),
      ]),
    ).toEqual([["notebook", "backseat", "overcast", "kernel"]]);
  });

  it("does not reuse the same normalized word within one group", () => {
    const words = parseWordList("abcdefgh\nzzczzzzh\nhzzzzzzc");
    const result = findMatchingGroups(words, {
      anchorLength: 8,
      rules: [
        { id: "one", length: 8, anchorPosition: 3, wordPosition: 8 },
        { id: "two", length: 8, anchorPosition: 8, wordPosition: 1 },
      ],
    });

    expect(result.groups).toEqual([]);
  });
});
