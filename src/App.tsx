import { Copy, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { findMatchingGroups, LinkedWordRule, MultiMatchConfig, parseWordList } from "./lib/wordMatcher";

const sampleWords = `notebook
backseat
overcast
kernel
sounder
briskets
stalwart
banknote
station
co-op
rocket
silver`;

const defaultRules: LinkedWordRule[] = [
  { id: "rule-1", length: 8, anchorPosition: 3, wordPosition: 8 },
  { id: "rule-2", length: 8, anchorPosition: 6, wordPosition: 1 },
  { id: "rule-3", length: 6, anchorPosition: 8, wordPosition: 1 },
];

const defaultConfig: MultiMatchConfig = {
  anchorLength: 8,
  rules: defaultRules,
};

const maxWordLength = 8;
const wordLengths = Array.from({ length: maxWordLength }, (_, index) => index + 1);

function clampLength(value: number) {
  return Math.max(1, Math.min(value, maxWordLength));
}

function clampPosition(value: number, length: number) {
  return Math.max(1, Math.min(value, Math.max(length, 1)));
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {options.map((option) => (
          <option value={option} key={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function PositionSelect({
  label,
  value,
  length,
  onChange,
}: {
  label: string;
  value: number;
  length: number;
  onChange: (value: number) => void;
}) {
  const positions = Array.from({ length: Math.max(length, 1) }, (_, index) => index + 1);

  return <SelectField label={label} value={value} options={positions} onChange={onChange} />;
}

export function App() {
  const [wordInput, setWordInput] = useState(sampleWords);
  const [config, setConfig] = useState(defaultConfig);

  const words = useMemo(() => parseWordList(wordInput), [wordInput]);
  const result = useMemo(() => findMatchingGroups(words, config), [words, config]);
  const anchorWords = useMemo(
    () => words.filter((word) => word.value.length === config.anchorLength),
    [words, config.anchorLength],
  );

  const updateAnchorLength = (anchorLength: number) => {
    const nextAnchorLength = clampLength(anchorLength);

    setConfig((current) => ({
      ...current,
      anchorLength: nextAnchorLength,
      rules: current.rules.map((rule) => ({
        ...rule,
        anchorPosition: clampPosition(rule.anchorPosition, nextAnchorLength),
      })),
    }));
  };

  const updateRule = (id: string, patch: Partial<LinkedWordRule>) => {
    setConfig((current) => ({
      ...current,
      rules: current.rules.map((rule) => {
        if (rule.id !== id) {
          return rule;
        }

        const next = { ...rule, ...patch };
        next.length = clampLength(next.length);
        next.anchorPosition = clampPosition(next.anchorPosition, current.anchorLength);
        next.wordPosition = clampPosition(next.wordPosition, next.length);
        return next;
      }),
    }));
  };

  const addRule = () => {
    setConfig((current) => ({
      ...current,
      rules: [
        ...current.rules,
        {
          id: `rule-${Date.now()}`,
          length: current.anchorLength,
          anchorPosition: 1,
          wordPosition: 1,
        },
      ],
    }));
  };

  const removeRule = (id: string) => {
    setConfig((current) => ({
      ...current,
      rules: current.rules.filter((rule) => rule.id !== id),
    }));
  };

  const copyResults = async () => {
    const text = result.groups
      .map((group) => {
        const matches = group.matches.map((match) => match.word.value).join(", ");
        return matches.length > 0 ? `${group.anchor.value} -> ${matches}` : group.anchor.value;
      })
      .join("\n");

    await navigator.clipboard.writeText(text);
  };

  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="intro">
          <div>
            <p className="eyebrow">Wordfinder</p>
            <h1>Match word sets by shared letters</h1>
          </div>
          <div className="summary-strip" aria-label="Word list summary">
            <span>{words.length} clean words</span>
            <span>{anchorWords.length} anchors</span>
            <span>{result.groups.length} sets</span>
          </div>
        </div>

        <div className="tool-layout">
          <section className="panel input-panel" aria-labelledby="word-list-heading">
            <div className="panel-header">
              <div>
                <h2 id="word-list-heading">Word list</h2>
                <p>One string per line. Non-letter characters are removed before matching.</p>
              </div>
              <button className="icon-button" type="button" onClick={() => setWordInput("")} title="Clear list">
                <Trash2 aria-hidden="true" size={18} />
              </button>
            </div>
            <textarea
              value={wordInput}
              spellCheck={false}
              onChange={(event) => setWordInput(event.target.value)}
              aria-label="Newline delimited word list"
            />
          </section>

          <section className="panel criteria-panel" aria-labelledby="criteria-heading">
            <div className="panel-header">
              <div>
                <h2 id="criteria-heading">Match rules</h2>
                <p>Start with an anchor word, then add linked words whose letters must match it.</p>
              </div>
              <button className="copy-button" type="button" onClick={addRule} title="Add linked word rule">
                <Plus aria-hidden="true" size={17} />
                Add
              </button>
            </div>

            <div className="criteria-stack">
              <div className="anchor-card">
                <div>
                  <h3>Anchor word</h3>
                  <p>{anchorWords.length} candidates</p>
                </div>
                <SelectField
                  label="Length"
                  value={config.anchorLength}
                  options={wordLengths}
                  onChange={updateAnchorLength}
                />
              </div>

              <div className="rules-list">
                {config.rules.map((rule, index) => {
                  const candidateCount = words.filter(
                    (word) => word.value.length === rule.length && word.value !== "",
                  ).length;

                  return (
                    <div className="rule-card" key={rule.id}>
                      <div className="rule-card-header">
                        <div>
                          <h3>Linked word {index + 1}</h3>
                          <p>{candidateCount} length candidates</p>
                        </div>
                        <button
                          className="icon-button compact-button"
                          type="button"
                          onClick={() => removeRule(rule.id)}
                          title="Remove linked word rule"
                        >
                          <X aria-hidden="true" size={17} />
                        </button>
                      </div>
                      <div className="rule-fields">
                        <SelectField
                          label="Word length"
                          value={rule.length}
                          options={wordLengths}
                          onChange={(value) => updateRule(rule.id, { length: value })}
                        />
                        <PositionSelect
                          label="Anchor position"
                          value={rule.anchorPosition}
                          length={config.anchorLength}
                          onChange={(value) => updateRule(rule.id, { anchorPosition: value })}
                        />
                        <PositionSelect
                          label="Linked position"
                          value={rule.wordPosition}
                          length={rule.length}
                          onChange={(value) => updateRule(rule.id, { wordPosition: value })}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        <section className="panel results-panel" aria-labelledby="results-heading">
          <div className="panel-header">
            <div>
              <h2 id="results-heading">Matching sets</h2>
              <p>
                {config.anchorLength}-letter anchors checked against {config.rules.length} linked word{" "}
                {config.rules.length === 1 ? "rule" : "rules"}.
              </p>
            </div>
            <button
              className="copy-button"
              type="button"
              onClick={copyResults}
              disabled={result.groups.length === 0}
              title="Copy matches"
            >
              <Copy aria-hidden="true" size={17} />
              Copy
            </button>
          </div>

          {result.groups.length > 0 ? (
            <>
              {result.truncated ? (
                <p className="result-note">Showing the first 5,000 sets. Narrow the rules to see fewer results.</p>
              ) : null}
              <div className="results-table" role="table" aria-label="Matching word sets">
                <div className="table-row table-head" role="row">
                  <span role="columnheader">Anchor</span>
                  <span role="columnheader">Linked words</span>
                </div>
                {result.groups.map((group, groupIndex) => (
                  <div className="table-row" role="row" key={`${group.anchor.value}-${groupIndex}`}>
                    <span role="cell" className="anchor-word">
                      {group.anchor.value}
                    </span>
                    <span role="cell" className="match-list">
                      {group.matches.map((match) => (
                        <span className="match-chip" key={`${match.rule.id}-${match.word.value}`}>
                          <span>{match.word.value}</span>
                          <span className="shared-letter">{match.sharedLetter}</span>
                          <span className="match-meta">
                            A{match.rule.anchorPosition}:W{match.rule.wordPosition}
                          </span>
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <Search aria-hidden="true" size={28} />
              <p>No word sets match these rules yet.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
