"use client";

import { useMemo, useState } from "react";
import { categories, domainColors, gradeLevels, matrix } from "@/lib/liftlabData";

const disclaimer =
  "Always vet the safety and security of any application before use with students. Check with your school district's IT department or DBA before using any student-facing tools or tools that involve student data. The suggestions below are starting points for your own research, not endorsements.";

const emptyAi = { loading: false, error: false };

function shade(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function keyFor(domain, subdomain, category, strategy) {
  return `${domain}::${subdomain}::${category}::${strategy}`;
}

function labelForKey(key) {
  const [domain, subdomain, category, strategy] = key.split("::");
  return { domain, subdomain, category, strategy };
}

function Header({ step }) {
  return (
    <header className="no-print">
      <div className="rainbow-rule h-2 w-full" />
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-soft">
              <div className="h-7 w-7 rounded-full bg-[conic-gradient(#7c3aed,#2563eb,#16a34a,#d97706,#dc2626,#7c3aed)]" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-normal text-neutral-950">LiftLab</h1>
              <p className="text-lg font-semibold text-neutral-700">Designing Supports for Every Learner.</p>
            </div>
          </div>
          <p className="mt-2 text-xs font-semibold uppercase tracking-normal text-neutral-500">A Vital by Design Tool - Dr. Sharon Matthews</p>
        </div>
        <div className="w-full max-w-md">
          <div className="mb-2 flex justify-between text-xs font-bold text-neutral-500">
            <span>Step {step} of 6</span>
            <span>{["Setup", "Variability", "Strategies", "Implement", "Fade", "Plan"][step - 1]}</span>
          </div>
          <div className="h-3 rounded-full bg-white shadow-inner">
            <div className="h-3 rounded-full bg-[linear-gradient(90deg,#7c3aed,#2563eb,#16a34a,#d97706,#dc2626)]" style={{ width: `${(step / 6) * 100}%` }} />
          </div>
        </div>
      </div>
    </header>
  );
}

function Button({ children, variant = "primary", className = "", ...props }) {
  const styles =
    variant === "secondary"
      ? "border-2 border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300"
      : variant === "quiet"
        ? "bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
        : "bg-neutral-950 text-white hover:bg-neutral-800";
  return (
    <button className={`rounded-2xl px-5 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}

function ErrorBox({ onRetry }) {
  return (
    <div className="rounded-2xl border-2 border-red-100 bg-red-50 p-4 text-red-900">
      <p className="font-black">Something went wrong - try again.</p>
      <Button variant="secondary" className="mt-3 border-red-200" onClick={onRetry}>Retry</Button>
    </div>
  );
}

export default function Home() {
  const [step, setStep] = useState(1);
  const [lessonDescription, setLessonDescription] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [touched, setTouched] = useState(false);
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [selectedSubdomains, setSelectedSubdomains] = useState({});
  const [selectedStrategies, setSelectedStrategies] = useState([]);
  const [tools, setTools] = useState([]);
  const [toolAi, setToolAi] = useState(emptyAi);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false);
  const [implementation, setImplementation] = useState([]);
  const [selectedImplementation, setSelectedImplementation] = useState([]);
  const [implementationAi, setImplementationAi] = useState(emptyAi);
  const [fading, setFading] = useState([]);
  const [selectedFading, setSelectedFading] = useState([]);
  const [fadingAi, setFadingAi] = useState(emptyAi);

  const selectedPairs = useMemo(
    () =>
      selectedDomains.flatMap((domain) =>
        (selectedSubdomains[domain] || []).map((subdomain) => ({
          domain,
          subdomain,
          color: domainColors[domain]
        }))
      ),
    [selectedDomains, selectedSubdomains]
  );

  const selectedDomainsText = selectedPairs.map((pair) => `${pair.domain}: ${pair.subdomain}`).join("\n");

  const selectedStrategiesByPair = useMemo(() => {
    const grouped = {};
    selectedStrategies.forEach((key) => {
      const item = labelForKey(key);
      const pairKey = `${item.domain}::${item.subdomain}`;
      grouped[pairKey] ||= [];
      grouped[pairKey].push(item);
    });
    return grouped;
  }, [selectedStrategies]);

  const selectedStrategiesText = selectedPairs
    .map((pair) => {
      const items = selectedStrategiesByPair[`${pair.domain}::${pair.subdomain}`] || [];
      const strategyText = items.map((item) => `${item.category}: ${item.strategy}`).join("; ") || "No specific strategies selected";
      return `${pair.domain} / ${pair.subdomain}: ${strategyText}`;
    })
    .join("\n");

  const missingLesson = touched && !lessonDescription.trim();
  const missingGrade = touched && !gradeLevel;
  const missingVariability = touched && (!selectedDomains.length || !selectedPairs.length);

  function toggleDomain(domain) {
    setSelectedDomains((current) => {
      if (current.includes(domain)) {
        setSelectedSubdomains((subs) => {
          const next = { ...subs };
          delete next[domain];
          return next;
        });
        setSelectedStrategies((items) => items.filter((key) => !key.startsWith(`${domain}::`)));
        return current.filter((item) => item !== domain);
      }
      return [...current, domain];
    });
  }

  function toggleSubdomain(domain, subdomain) {
    setSelectedSubdomains((current) => {
      const list = current[domain] || [];
      const exists = list.includes(subdomain);
      const nextList = exists ? list.filter((item) => item !== subdomain) : [...list, subdomain];
      if (exists) {
        setSelectedStrategies((items) => items.filter((key) => !key.startsWith(`${domain}::${subdomain}::`)));
      }
      return { ...current, [domain]: nextList };
    });
  }

  function toggleItem(setter, value) {
    setter((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  async function callAi(callType, setter, resultHandler) {
    setter({ loading: true, error: false });
    const payload = {
      callType,
      lessonDescription,
      gradeLevel,
      selectedDomainsAndSubdomains: selectedDomainsText,
      selectedStrategies: selectedStrategiesText
    };

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error("AI request failed");
        const data = await response.json();
        resultHandler(data);
        setter({ loading: false, error: false });
        return;
      } catch {
        if (attempt === 1) setter({ loading: false, error: true });
      }
    }
  }

  function requestTools() {
    setShowDisclaimer(true);
    callAi("tools", setToolAi, (data) => setTools(data.tools || []));
  }

  function requestImplementation() {
    callAi("implementation", setImplementationAi, (data) => {
      setImplementation(data.suggestions || []);
      setSelectedImplementation([]);
    });
  }

  function requestFading() {
    callAi("fading", setFadingAi, (data) => {
      setFading(data.fadingStrategies || []);
      setSelectedFading([]);
    });
  }

  function goStep2() {
    setTouched(true);
    if (!lessonDescription.trim() || !gradeLevel) return;
    setTouched(false);
    setStep(2);
  }

  function goStep3() {
    setTouched(true);
    if (!selectedDomains.length || !selectedPairs.length) return;
    setTouched(false);
    setStep(3);
  }

  function outputRows() {
    return selectedPairs.map((pair) => {
      const strategies = (selectedStrategiesByPair[`${pair.domain}::${pair.subdomain}`] || []).map((item) => item.strategy);
      return { ...pair, strategies };
    });
  }

  return (
    <>
      <Header step={step} />
      <main className="screen-shell mx-auto max-w-7xl px-5 pb-28">
        {step === 1 && (
          <section className="rounded-3xl bg-white p-6 shadow-soft md:p-8">
            <h2 className="text-2xl font-black">Lesson Setup</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-[1.5fr_1fr]">
              <label className="block">
                <span className="text-sm font-black text-neutral-700">Describe your lesson</span>
                <textarea
                  className={`mt-2 min-h-44 w-full rounded-2xl border-2 bg-white p-4 outline-none focus:border-neutral-900 ${missingLesson ? "border-red-400" : "border-neutral-200"}`}
                  placeholder="e.g. Life cycle of the butterfly"
                  value={lessonDescription}
                  onChange={(event) => setLessonDescription(event.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-sm font-black text-neutral-700">Grade level</span>
                <select
                  className={`mt-2 h-14 w-full rounded-2xl border-2 bg-white px-4 outline-none focus:border-neutral-900 ${missingGrade ? "border-red-400" : "border-neutral-200"}`}
                  value={gradeLevel}
                  onChange={(event) => setGradeLevel(event.target.value)}
                >
                  <option value="">Choose a grade</option>
                  {gradeLevels.map((grade) => <option key={grade}>{grade}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={goStep2}>Next</Button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-5">
            <div className="rounded-3xl bg-white p-6 shadow-soft md:p-8">
              <h2 className="text-2xl font-black">Domain + Subdomain Selection</h2>
              {missingVariability && <p className="mt-2 font-bold text-red-700">Choose at least one domain and one subdomain.</p>}
              <div className="mt-6 grid gap-4 lg:grid-cols-5">
                {Object.keys(matrix).map((domain) => {
                  const color = domainColors[domain];
                  const selected = selectedDomains.includes(domain);
                  return (
                    <div key={domain} className="rounded-3xl border-2 bg-white p-3" style={{ borderColor: selected ? color : "#eee" }}>
                      <button
                        className="min-h-28 w-full rounded-2xl p-4 text-left font-black text-white shadow-soft transition"
                        style={{ background: color, opacity: selected ? 1 : 0.78 }}
                        onClick={() => toggleDomain(domain)}
                      >
                        {domain}
                      </button>
                      {selected && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {Object.keys(matrix[domain]).map((subdomain) => {
                            const subSelected = (selectedSubdomains[domain] || []).includes(subdomain);
                            return (
                              <button
                                key={subdomain}
                                className="rounded-full border-2 px-3 py-2 text-xs font-black transition"
                                style={{
                                  borderColor: color,
                                  background: subSelected ? color : shade(color, 0.1),
                                  color: subSelected ? "white" : color
                                }}
                                onClick={() => toggleSubdomain(domain, subdomain)}
                              >
                                {subdomain}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex justify-between">
                <Button variant="quiet" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={goStep3}>Next</Button>
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-soft md:p-8">
              <h2 className="text-2xl font-black">Strategy Matrix</h2>
              <div className="mt-6 space-y-7">
                {selectedDomains.map((domain) => (
                  <div key={domain} className="overflow-hidden rounded-3xl border-2" style={{ borderColor: shade(domainColors[domain], 0.3) }}>
                    <h3 className="px-5 py-4 text-xl font-black text-white" style={{ background: domainColors[domain] }}>{domain}</h3>
                    <div className="space-y-6 p-5">
                      {(selectedSubdomains[domain] || []).map((subdomain) => (
                        <div key={subdomain}>
                          <h4 className="mb-3 text-lg font-black" style={{ color: domainColors[domain] }}>{subdomain}</h4>
                          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                            {categories.map((category) => (
                              <div key={category} className="rounded-2xl bg-neutral-50 p-3">
                                <p className="mb-3 rounded-xl px-3 py-2 text-center text-xs font-black text-white" style={{ background: domainColors[domain] }}>{category}</p>
                                <div className="flex flex-wrap gap-2">
                                  {matrix[domain][subdomain][category].map((strategy) => {
                                    const id = keyFor(domain, subdomain, category, strategy);
                                    const selected = selectedStrategies.includes(id);
                                    return (
                                      <button
                                        key={id}
                                        className="rounded-full border-2 px-3 py-2 text-left text-xs font-black transition"
                                        style={{
                                          borderColor: domainColors[domain],
                                          background: selected ? domainColors[domain] : "white",
                                          color: selected ? "white" : domainColors[domain]
                                        }}
                                        onClick={() => toggleItem(setSelectedStrategies, id)}
                                      >
                                        {strategy}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {(showDisclaimer && !disclaimerDismissed) && (
              <div className="rounded-3xl border-2 border-amber-200 bg-amber-50 p-5 text-amber-950">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <p><strong>Warning:</strong> {disclaimer}</p>
                  <Button variant="secondary" className="shrink-0 border-amber-300" onClick={() => setDisclaimerDismissed(true)}>Dismiss</Button>
                </div>
              </div>
            )}

            {toolAi.error && <ErrorBox onRetry={requestTools} />}
            {toolAi.loading && <div className="rounded-3xl bg-white p-5 font-black shadow-soft">Researching AI tools...</div>}
            {!!tools.length && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {tools.map((tool, index) => (
                  <article key={`${tool.name}-${index}`} className="rounded-3xl bg-white p-5 shadow-soft">
                    <h3 className="text-lg font-black">{tool.name}</h3>
                    <p className="mt-2 text-sm text-neutral-700">{tool.description}</p>
                    <p className="mt-3 text-sm"><strong>Supports:</strong> {tool.supports}</p>
                    <p className="mt-2 text-sm"><strong>Age note:</strong> {tool.ageNote}</p>
                    <span className="mt-4 inline-flex rounded-full bg-neutral-100 px-3 py-1 text-xs font-black">
                      {tool.teacherFacing && tool.studentFacing ? "Both" : tool.teacherFacing ? "Teacher-facing" : "Student-facing"}
                    </span>
                  </article>
                ))}
              </div>
            )}

            <div className="no-print fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white/95 px-5 py-4 shadow-soft backdrop-blur">
              <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-lg font-black">{selectedStrategies.length} strategies selected</p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={requestTools} disabled={toolAi.loading}>Suggest AI Tools to Research</Button>
                  <Button onClick={() => setStep(4)}>Build My Support Plan</Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="space-y-5 rounded-3xl bg-white p-6 shadow-soft md:p-8">
            <h2 className="text-2xl font-black">Implementation Suggestions</h2>
            <div className="rounded-2xl bg-neutral-50 p-4 text-sm">
              <p><strong>Lesson:</strong> {lessonDescription}, {gradeLevel}</p>
              <p className="mt-2"><strong>Areas:</strong> {selectedPairs.map((pair) => `${pair.domain} / ${pair.subdomain}`).join(", ")}</p>
              <p className="mt-2"><strong>Strategies selected:</strong> {selectedStrategies.length}</p>
            </div>
            <Button onClick={requestImplementation} disabled={implementationAi.loading}>How could I implement these in my lesson?</Button>
            {implementationAi.loading && <p className="font-black">Generating implementation ideas...</p>}
            {implementationAi.error && <ErrorBox onRetry={requestImplementation} />}
            {!!implementation.length && (
              <div className="grid gap-4 md:grid-cols-3">
                {implementation.map((item, index) => {
                  const selected = selectedImplementation.includes(index);
                  return (
                    <button
                      key={item.title}
                      className={`rounded-3xl border-2 p-5 text-left transition ${selected ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-200 bg-white"}`}
                      onClick={() => toggleItem(setSelectedImplementation, index)}
                    >
                      <h3 className="text-lg font-black">{item.title}</h3>
                      <p className={`mt-2 text-sm ${selected ? "text-neutral-100" : "text-neutral-700"}`}>{item.description}</p>
                      <p className="mt-3 text-xs font-black">{(item.strategiesUsed || []).join(", ")}</p>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="quiet" onClick={() => setStep(3)}>Back</Button>
              <Button onClick={() => setStep(5)} disabled={!implementation.length}>Generate My LiftLab Plan</Button>
            </div>
          </section>
        )}

        {step === 5 && (
          <section className="space-y-5 rounded-3xl bg-white p-6 shadow-soft md:p-8">
            <div className="rounded-3xl border-2 border-neutral-900 bg-neutral-950 p-6 text-white">
              <h2 className="text-2xl font-black">Before we look at the AI suggestions - think about this:</h2>
              <p className="mt-3 text-xl font-semibold">For the supports you've selected, what would fading toward independence actually look like for YOUR learners? How would you know when to pull back?</p>
            </div>
            <Button onClick={requestFading} disabled={fadingAi.loading}>Show me AI suggestions for fading these supports</Button>
            {fadingAi.loading && <p className="font-black">Generating fading suggestions...</p>}
            {fadingAi.error && <ErrorBox onRetry={requestFading} />}
            {!!fading.length && (
              <div className="grid gap-4 md:grid-cols-2">
                {fading.map((item, index) => {
                  const selected = selectedFading.includes(index);
                  return (
                    <button
                      key={`${item.support}-${index}`}
                      className={`rounded-3xl border-2 p-5 text-left transition ${selected ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-200 bg-white"}`}
                      onClick={() => toggleItem(setSelectedFading, index)}
                    >
                      <h3 className="font-black">{item.support}</h3>
                      <p className="mt-2 text-sm"><strong>Indicator:</strong> {item.indicator}</p>
                      <p className="mt-2 text-sm"><strong>Next step:</strong> {item.nextStep}</p>
                      <p className="mt-2 text-sm"><strong>Independence:</strong> {item.independenceMarker}</p>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="quiet" onClick={() => setStep(4)}>Back</Button>
              <Button onClick={() => setStep(6)} disabled={!fading.length}>Generate My LiftLab Plan</Button>
            </div>
          </section>
        )}

        {step === 6 && (
          <section className="space-y-5">
            <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-5 shadow-soft">
              <h2 className="text-2xl font-black">Your LiftLab Plan</h2>
              <div className="flex gap-3">
                <Button variant="quiet" onClick={() => setStep(5)}>Back</Button>
                <Button onClick={() => window.print()}>Print / Save PDF</Button>
              </div>
            </div>
            <PlanTable
              lessonDescription={lessonDescription}
              gradeLevel={gradeLevel}
              rows={outputRows()}
              tools={tools}
              implementation={implementation}
              selectedImplementation={selectedImplementation}
              fading={fading}
              selectedFading={selectedFading}
            />
          </section>
        )}
      </main>
    </>
  );
}

function PlanTable({ lessonDescription, gradeLevel, rows, tools, implementation, selectedImplementation, fading, selectedFading }) {
  const date = new Date().toLocaleDateString();
  const selectedIdeas = selectedImplementation.map((index) => implementation[index]).filter(Boolean);
  const selectedFade = selectedFading.map((index) => fading[index]).filter(Boolean);
  const columnCount = 2 + (tools.length ? 1 : 0) + selectedIdeas.length + (selectedFade.length ? 1 : 0);

  return (
    <div className="print-area overflow-x-auto rounded-3xl bg-white p-4 shadow-soft print:rounded-none print:p-0 print:shadow-none">
      <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
        <thead>
          <tr>
            <th className="border border-neutral-300 p-3 text-xl font-black">LiftLab</th>
            <th className="border border-neutral-300 p-3 text-center font-black" colSpan={Math.max(columnCount - 2, 1)}>{date}</th>
            <th className="border border-neutral-300 p-3 text-right text-xs font-black">A Vital by Design Tool - Dr. Sharon Matthews</th>
          </tr>
          <tr>
            <th className="border border-neutral-300 bg-purple-50 p-4 text-base font-black" colSpan={columnCount}>
              Lesson: {lessonDescription}, {gradeLevel}
            </th>
          </tr>
          <tr>
            <th className="border border-neutral-300 p-3 font-black">Domain & Subdomain</th>
            <th className="border border-neutral-300 p-3 font-black">Selected Strategies</th>
            {!!tools.length && <th className="border border-neutral-300 p-3 font-black">AI Tools to Research</th>}
            {selectedIdeas.map((_, index) => <th key={index} className="border border-neutral-300 p-3 font-black">Implementation Idea {index + 1}</th>)}
            {!!selectedFade.length && <th className="border border-neutral-300 p-3 font-black">Fading Toward Independence</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.domain}-${row.subdomain}`}>
              <td className="border border-neutral-300 p-3 align-top font-black" style={{ borderLeft: `8px solid ${row.color}` }}>
                <span style={{ color: row.color }}>{row.domain}</span>
                <br />
                {row.subdomain}
              </td>
              <td className="border border-neutral-300 p-3 align-top">{row.strategies.length ? row.strategies.join(", ") : "No specific strategies selected"}</td>
              {!!tools.length && (
                <td className="border border-neutral-300 p-3 align-top">
                  {tools.map((tool) => `${tool.name}: ${tool.supports}`).join("; ")}
                </td>
              )}
              {selectedIdeas.map((idea, index) => (
                <td key={index} className="border border-neutral-300 p-3 align-top">
                  <strong>{idea.title}</strong>
                  <br />
                  {idea.description}
                </td>
              ))}
              {!!selectedFade.length && (
                <td className="border border-neutral-300 p-3 align-top">
                  {selectedFade.map((item) => `${item.support}: ${item.nextStep} Independence marker: ${item.independenceMarker}`).join("; ")}
                </td>
              )}
            </tr>
          ))}
          <tr>
            <td className="border border-neutral-300 bg-neutral-50 p-3 text-xs" colSpan={columnCount}>
              Disclaimer: Always vet the safety and security of any application before use with students. Check with your school district's IT department or DBA before using any student-facing tools or tools that involve student data. AI tool suggestions are starting points for your own research, not endorsements. LiftLab is a Vital by Design tool. © Dr. Sharon Matthews.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
