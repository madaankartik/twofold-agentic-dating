import React, { useState, useEffect, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Plus,
  Search,
  Heart,
  Sparkles,
  Check,
  CheckCheck,
  Instagram,
  Linkedin,
  X,
  Play,
  Pause,
  ChevronRight,
  ChevronDown,
  BookOpen,
  MessageCircle,
  SlidersHorizontal,
  ExternalLink,
  RefreshCw,
  LoaderCircle,
  Info,
  ShieldCheck,
  Quote,
  CheckCircle2,
  AlertCircle,
  Leaf,
  Clock,
  Link2,
  Eye,
  Radio,
  Download,
} from "lucide-react";
import type {
  Person,
  DateSession,
  Ranking,
  Health,
  Job,
  Evidence,
} from "./types";
import "./styles.css";
async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch("/api" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(
      data.error || "This step could not be completed. Please retry.",
    );
  return data;
}
function useRoute() {
  const [route, set] = useState(location.hash.slice(1) || "people");
  useEffect(() => {
    const h = () => set(location.hash.slice(1) || "people");
    addEventListener("hashchange", h);
    return () => removeEventListener("hashchange", h);
  }, []);
  return route;
}
const go = (route: string) => {
  location.hash = route;
  window.scrollTo({ top: 0, behavior: "instant" });
};
function IconButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      className="icon-button"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
function Avatar({ p, size = "medium" }: { p: Person; size?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [p.imageUrl]);
  return (
    <div className={`avatar ${p.color} ${size}`}>
      {p.imageUrl && !failed ? (
        <img
          src={p.imageUrl}
          alt={p.name}
          onError={() => setFailed(true)}
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      ) : (
        <span>{p.initials}</span>
      )}
    </div>
  );
}
function SourceLinks({ p, compact = false }: { p: Person; compact?: boolean }) {
  return (
    <div className="source-links">
      <a
        href={p.linkedinUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`${p.name} on LinkedIn`}
      >
        <Linkedin size={14} />
        {!compact && "LinkedIn"}
        <ArrowUpRight size={12} />
      </a>
      <a
        href={p.instagramUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`${p.name} on Instagram`}
      >
        <Instagram size={14} />
        {!compact && "Instagram"}
        <ArrowUpRight size={12} />
      </a>
    </div>
  );
}
function Tag({ children }: { children: React.ReactNode }) {
  return <span className="tag">{children}</span>;
}
function Empty({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Sparkles size={28} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function App() {
  const route = useRoute();
  const [people, setPeople] = useState<Person[]>([]),
    [dates, setDates] = useState<DateSession[]>([]),
    [health, setHealth] = useState<Health | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [method, setMethod] = useState(false);
  const refreshVersion = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++refreshVersion.current;
    try {
      const [p, d, h] = await Promise.all([
        api<Person[]>("/people"),
        api<DateSession[]>("/dates"),
        api<Health>("/health"),
      ]);
      if (version !== refreshVersion.current) return;
      setPeople(p);
      setDates(d);
      setHealth(h);
      setError("");
    } catch (e) {
      if (version === refreshVersion.current) setError((e as Error).message);
    } finally {
      if (version === refreshVersion.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
    return () => {
      refreshVersion.current++;
    };
  }, [refresh]);
  const routePath = route.split("?")[0];
  const routeQuery = new URLSearchParams(route.split("?")[1] || "");
  const active = routePath.split("/")[0];
  const ready = people.filter((p) => p.status === "ready");
  const completed = dates.filter((d) => d.status === "complete");
  return (
    <>
      <header className="header">
        <a className="brand" href="#people" aria-label="Twofold home">
          <span className="brand-symbol">
            t<span>f</span>
          </span>
          twofold<span className="brand-dot">.</span>
        </a>
        <nav aria-label="Main navigation">
          <a
            className={["people", "person"].includes(active) ? "active" : ""}
            href="#people"
          >
            The people<span>{ready.length || "—"}</span>
          </a>
          <a className={active === "dates" ? "active" : ""} href="#dates">
            The dates
          </a>
          <a className={active === "rankings" ? "active" : ""} href="#rankings">
            The matches
          </a>
        </nav>
        <div className="header-actions">
          <button
            className="quiet method-button"
            onClick={() => setMethod(true)}
          >
            How it works <ArrowUpRight size={14} />
          </button>
          <button className="button primary small" onClick={() => go("add")}>
            <Plus size={16} /> Add a person
          </button>
        </div>
      </header>
      <main className="main">
        {error && (
          <div className="notice error">
            <AlertCircle size={17} />
            <span>{error}</span>
            <button onClick={refresh}>Retry</button>
          </div>
        )}
        {loading ? (
          <div className="loading-page">
            <LoaderCircle className="spin" />
            <p>Getting the table ready…</p>
          </div>
        ) : active === "person" ? (
          <Profile
            p={people.find((p) => p.id === routePath.split("/")[1])}
            dates={dates}
          />
        ) : active === "add" ? (
          <AddPerson refresh={refresh} route={route} />
        ) : active === "dates" ? (
          <Dates
            people={ready}
            dates={dates}
            dateId={routePath.split("/")[1]}
            withPersonId={routeQuery.get("with") || undefined}
            resumeRequested={routeQuery.get("resume") === "1"}
            refresh={refresh}
          />
        ) : active === "rankings" ? (
          <Rankings
            people={ready}
            personId={routePath.split("/")[1]}
            dates={dates}
          />
        ) : (
          <People people={people} dates={completed} health={health} />
        )}
      </main>
      <footer>
        <span className="footer-brand">A meeting of minds.</span>
        <span>Public profiles. Simulated dates. Real curiosity.</span>
        <button className="quiet" onClick={() => setMethod(true)}>
          Our method <ArrowUpRight size={13} />
        </button>
      </footer>
      {method && (
        <div className="modal-backdrop" onClick={() => setMethod(false)}>
          <section
            className="modal method"
            role="dialog"
            aria-modal="true"
            aria-labelledby="method-title"
            onClick={(e) => e.stopPropagation()}
          >
            <IconButton onClick={() => setMethod(false)} label="Close">
              <X size={20} />
            </IconButton>
            <span className="eyebrow">THE TWOFOLD METHOD</span>
            <h2 id="method-title">Curiosity, with receipts.</h2>
            <p>
              Each agent begins with two public profiles. Every observation
              links back to the person's own LinkedIn or Instagram.
            </p>
            <ol>
              <li>
                <b>Read the person.</b> Extract interests and stated priorities.
                Keep unsupported relationship needs unknown.
              </li>
              <li>
                <b>Let the agents meet.</b> Separate agent contexts propose,
                respond, adapt, then independently assess a simulated date.
              </li>
              <li>
                <b>Explain the fit.</b> Directional rankings combine documented
                interests with a bounded adjustment after a completed date.
              </li>
            </ol>
            <div className="method-grid">
              <div>
                <b>{ready.length}</b>
                <span>complete profiles</span>
              </div>
              <div>
                <b>{completed.length}</b>
                <span>completed dates</span>
              </div>
              <div>
                <b>{ready.length * Math.max(0, ready.length - 1)}</b>
                <span>ranked comparisons</span>
              </div>
            </div>
            <p className="small-text">
              A profile comparison is preliminary. A completed date adds
              simulated interaction evidence, not new facts about a person.
              Scores are heuristic indices, not probabilities of romantic
              success. The people shown have not participated in or endorsed
              these simulations.
            </p>
            <p className="small-text">
              Live engine:{" "}
              {health?.groq
                ? "Groq · separate model calls"
                : "Evidence-based negotiation rules"}
              . Both engines are labeled in each date. Missing data lowers
              confidence; we do not infer intimate preferences or availability.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
function People({
  people,
  dates,
  health,
}: {
  people: Person[];
  dates: DateSession[];
  health: Health | null;
}) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("Everyone");
  const tags = [
    "Everyone",
    "Creators",
    "Technology",
    "Art & design",
    "Food & travel",
  ];
  const filtered = people.filter((p) => {
    const hay = [p.name, p.headline, ...p.traits.map((t) => t.label)]
      .join(" ")
      .toLowerCase();
    const q = query.trim().toLowerCase();
    const f =
      filter === "Everyone" ||
      (filter === "Creators"
        ? /writing|storytelling|conversation/.test(hay)
        : filter === "Technology"
          ? /technology|entrepreneurship/.test(hay)
          : filter === "Art & design"
            ? /art|design|photography/.test(hay)
            : /food|travel|outdoors/.test(hay));
    return hay.includes(q) && f;
  });
  const ready = people.filter((p) => p.status === "ready");
  return (
    <>
      <section className="page-intro">
        <div>
          <div className="eyebrow">
            <span className="tiny-line" /> THE FIRST IMPRESSION, RECONSIDERED
          </div>
          <h1>
            Meet the person.
            <br />
            <em>Then meet their agent.</em>
          </h1>
          <p>Two profiles tell a story. A conversation finds the connection.</p>
        </div>
        <aside className="cohort-note">
          <div className="note-top">
            <span className="status-dot" /> THE OPEN TABLE{" "}
            <span className="issue">Nº 001</span>
          </div>
          <div className="note-count">
            <strong>{ready.length.toString().padStart(2, "0")}</strong>
            <span>
              people.
              <br />A world of possibility.
            </span>
          </div>
          <div className="note-bottom">
            <span>{dates.length} dates completed</span>
            <a href="#dates">
              Take a seat <ArrowUpRight size={16} />
            </a>
          </div>
        </aside>
      </section>
      <div className="section-heading">
        <div className="tabs" role="group" aria-label="Filter interests">
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={filter === t ? "selected" : ""}
            >
              {t}
              {t === "Everyone" && <span>{people.length}</span>}
            </button>
          ))}
        </div>
        <label className="search">
          <Search size={16} />
          <input
            aria-label="Search people or interests"
            placeholder="A name, an interest…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button aria-label="Clear search" onClick={() => setQuery("")}>
              <X size={14} />
            </button>
          )}
        </label>
      </div>
      <div className="people-grid">
        {filtered.map((p, i) => {
          const count = dates.filter(
            (d) => d.aId === p.id || d.bId === p.id,
          ).length;
          return (
            <article
              className={`person-card ${p.color}`}
              key={p.id}
              style={{ "--order": Math.min(i, 8) } as React.CSSProperties}
            >
              <button
                className="card-portrait"
                onClick={() => go("person/" + p.id)}
                aria-label={`Open ${p.name}'s profile`}
              >
                <span className="portrait-index">
                  {String(people.indexOf(p) + 1).padStart(2, "0")} / THE PEOPLE
                </span>
                <Avatar p={p} size="portrait" />
                <span className="portrait-mark">
                  <Sparkles size={13} />
                  {p.status === "ready" ? "Agent ready" : "Needs review"}
                </span>
                <span className="portrait-arrow">
                  <ArrowUpRight size={18} />
                </span>
              </button>
              <div className="card-body">
                <button
                  className="person-name"
                  onClick={() => go("person/" + p.id)}
                >
                  {p.name}
                </button>
                <p className="headline">{p.headline}</p>
                <div className="tags">
                  {p.traits.slice(0, 3).map((t) => (
                    <Tag key={t.label}>{t.label}</Tag>
                  ))}
                </div>
                <div className="card-bottom">
                  <SourceLinks p={p} compact />
                  <span>
                    {count
                      ? `${count} ${count === 1 ? "date" : "dates"}`
                      : "Not yet met"}
                    <span className="small-dot" />
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!filtered.length && (
        <Empty
          title={
            people.length ? "No one here just yet." : "The table is waiting."
          }
        >
          {people.length
            ? "Try another name or interest."
            : "Add two public profile links to create the first agent."}
        </Empty>
      )}
      <div className="bottom-note">
        <ShieldCheck size={16} />
        <span>
          Every profile has two sources. Every observation has evidence.
        </span>
        <button onClick={() => go("add")}>
          Bring someone to the table <ArrowRight size={15} />
        </button>
      </div>
    </>
  );
}
function EvidenceItem({ e }: { e: Evidence }) {
  return (
    <div className="evidence-item">
      <div className="evidence-label">
        {e.platform === "linkedin" ? (
          <Linkedin size={14} />
        ) : (
          <Instagram size={14} />
        )}
        <span>
          {e.platform === "linkedin" ? "LinkedIn" : "Instagram"} · {e.kind}
        </span>
        <span>
          {e.access === "apify"
            ? "Apify extraction"
            : e.access === "search-index"
              ? "Indexed source"
              : "Public source"}
        </span>
      </div>
      <blockquote>“{e.text}”</blockquote>
      <a href={e.url} target="_blank" rel="noreferrer">
        View original <ArrowUpRight size={13} />
      </a>
    </div>
  );
}
function Profile({
  p,
  dates,
}: {
  p: Person | undefined;
  dates: DateSession[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  if (!p)
    return (
      <Empty title="Profile not found">
        Return to the people and choose a profile.
      </Empty>
    );
  const related = dates.filter(
    (d) => d.status === "complete" && (d.aId === p.id || d.bId === p.id),
  );
  return (
    <>
      <button className="back-link" onClick={() => go("people")}>
        <ArrowLeft size={15} /> All people
      </button>
      <div className="profile-layout">
        <aside className={`profile-aside ${p.color}`}>
          <Avatar p={p} size="profile-photo" />
          <div className="profile-aside-body">
            <span className="eyebrow">A PERSON, BEYOND A PROFILE</span>
            <h1>{p.name}</h1>
            <p>{p.headline}</p>
            <SourceLinks p={p} />
            <div className="profile-source-state">
              <ShieldCheck size={16} />
              <span>
                {p.status === "ready"
                  ? "Both sources verified"
                  : "Profile needs verification"}
              </span>
            </div>
            <p className="muted tiny">
              @{p.instagramHandle} · Public Instagram{" "}
              {p.sourceStatus.publicVerified ? (
                <Check size={12} />
              ) : (
                <Info size={12} />
              )}
            </p>
          </div>
        </aside>
        <section className="profile-main">
          <div className="eyebrow">
            THE AGENT'S FIRST READ{" "}
            <span className="pill">
              {p.engine === "groq" ? "AI analysis" : "Evidence analysis"}
            </span>
          </div>
          <h2>Here’s what comes through.</h2>
          <p className="profile-summary">{p.summary}</p>
          <div className="profile-divider" />
          <div className="subheading">
            <h3>Interests & little obsessions</h3>
            <span>
              Follow the evidence <ArrowDownIcon />
            </span>
          </div>
          <div className="trait-list">
            {p.traits.map((t) => (
              <div className="trait" key={t.label}>
                <button
                  onClick={() => setOpen(open === t.label ? null : t.label)}
                  aria-expanded={open === t.label}
                >
                  <span>
                    <span className="trait-symbol">
                      {t.category === "hobby" ? (
                        <Leaf size={16} />
                      ) : t.category === "priority" ? (
                        <Heart size={16} />
                      ) : (
                        <Sparkles size={16} />
                      )}
                    </span>
                    <b>{t.label}</b>
                    <span className="trait-category">{t.category}</span>
                  </span>
                  <span>
                    <span className={`confidence ${t.confidence}`}>
                      {t.status === "tentative"
                        ? "Tentative"
                        : t.confidence === "high"
                          ? "Well supported"
                          : "Supported"}
                    </span>
                    <ChevronDown
                      size={16}
                      className={open === t.label ? "rotate" : ""}
                    />
                  </span>
                </button>
                {open === t.label && (
                  <div className="trait-evidence">
                    {p.evidence
                      .filter((e) => t.evidenceIds.includes(e.id))
                      .map((e) => (
                        <EvidenceItem key={e.id} e={e} />
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="needs-box">
            <div>
              <Heart size={19} />
              <h3>Needs, with room for the unknown.</h3>
            </div>
            <p>
              Public interests can start a conversation. They don’t tell us what
              someone needs from a relationship.
            </p>
            <ul>
              {p.unknowns.map((u) => (
                <li key={u}>
                  <span className="unknown">Unknown</span>
                  {u}
                </li>
              ))}
            </ul>
          </div>
          {p.questions.length > 0 && (
            <section className="questions">
              <span className="eyebrow">WHAT THEIR AGENT WOULD EXPLORE</span>
              {p.questions.map((q, i) => (
                <p key={q}>
                  <span>0{i + 1}</span>
                  {q}
                </p>
              ))}
            </section>
          )}
          <div className="profile-cta">
            <div>
              <b>Let a conversation add context.</b>
              <span>
                {related.length} completed simulated{" "}
                {related.length === 1 ? "date" : "dates"}
              </span>
            </div>
            <div className="profile-cta-actions">
              <button
                className="button primary"
                disabled={p.status !== "ready"}
                onClick={() => go("dates?with=" + encodeURIComponent(p.id))}
              >
                Meet another agent <ArrowRight size={16} />
              </button>
              <button
                className="text-link"
                disabled={p.status !== "ready"}
                onClick={() => go("rankings/" + p.id)}
              >
                Explore their matches <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
          <details className="all-evidence">
            <summary>
              Read all {p.evidence.length} source observations{" "}
              <ChevronDown size={16} />
            </summary>
            {p.evidence.map((e) => (
              <EvidenceItem e={e} key={e.id} />
            ))}
          </details>
          <p className="identity-note">
            <Link2 size={13} />
            {p.identityNote}
          </p>
        </section>
      </div>
    </>
  );
}
function ArrowDownIcon() {
  return <ChevronDown size={13} />;
}
function AddPerson({
  refresh,
  route,
}: {
  refresh: () => Promise<void>;
  route: string;
}) {
  const [li, setLi] = useState(""),
    [ig, setIg] = useState(""),
    [job, setJob] = useState<Job | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const jobId = new URLSearchParams(route.split("?")[1] || "").get("job");
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    setError("");
    setBusy(true);
    setJob(null);
    async function advance() {
      try {
        const current = await api<Job>("/jobs/" + jobId);
        if (cancelled) return;
        setJob(current);
        if (current.status === "complete" && current.personId) {
          await refresh();
          if (!cancelled) go("person/" + current.personId);
          return;
        }
        if (current.status === "failed") {
          setError(current.error || "Could not read these profiles.");
          setBusy(false);
          return;
        }
        setBusy(true);
        setError("");
        const remaining = current.retryAt
          ? Date.parse(current.retryAt) - Date.now()
          : 0;
        if (remaining > 0) {
          timer = setTimeout(advance, Math.min(5000, Math.max(200, remaining)));
          return;
        }
        await api("/jobs/" + jobId + "/advance", {});
        if (!cancelled) timer = setTimeout(advance, 1500);
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setBusy(false);
        }
      }
    }
    void advance();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [jobId, refresh]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api<{ jobId?: string; personId?: string }>("/people", {
        linkedinUrl: li,
        instagramUrl: ig,
      });
      if (r.personId) {
        await refresh();
        go("person/" + r.personId);
      } else go("add?job=" + r.jobId);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  async function retry() {
    if (!jobId) return;
    setBusy(true);
    setError("");
    try {
      await api("/jobs/" + jobId + "/advance", {});
      location.reload();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  const waitingForModel = job?.status === "running" && !!job.retryAt;
  const stages = ["queued", "reading", "analyzing", "complete"];
  return (
    <>
      <button className="back-link" onClick={() => go("people")}>
        <ArrowLeft size={15} /> Back to the table
      </button>
      <section className="add-layout">
        <div className="add-intro">
          <span className="eyebrow">TWO LINKS. ONE PERSON.</span>
          <h1>
            There’s a story
            <br />
            <em>between the profiles.</em>
          </h1>
          <p>
            Your work, your interests, the things you share.
            <br />
            Let your agent get to know a little of each.
          </p>
          <div className="link-illustration">
            <div className="link-orbit one">
              <Linkedin size={28} />
            </div>
            <span className="connecting-line" />
            <div className="illustration-heart">
              <Heart size={30} />
            </div>
            <span className="connecting-line" />
            <div className="link-orbit two">
              <Instagram size={28} />
            </div>
          </div>
          <div className="intake-notes">
            <p>
              <CheckCircle2 size={16} /> Public Instagram profiles only
            </p>
            <p>
              <CheckCircle2 size={16} /> Evidence from these two accounts only
            </p>
            <p>
              <CheckCircle2 size={16} /> No messages sent to the real people
            </p>
          </div>
        </div>
        <div className="add-panel">
          <div className="panel-heading">
            <span className="eyebrow">A NEW SEAT AT THE TABLE</span>
            <h2>Introduce a person.</h2>
            <p>Use two public profiles that belong to the same adult.</p>
          </div>
          <form onSubmit={submit}>
            <label className="form-label" htmlFor="linkedin">
              LinkedIn profile <Linkedin size={16} />
            </label>
            <input
              id="linkedin"
              type="url"
              required
              placeholder="https://www.linkedin.com/in/name"
              value={li}
              onChange={(e) => setLi(e.target.value)}
              disabled={busy}
            />
            <label className="form-label" htmlFor="instagram">
              Instagram profile <Instagram size={16} />
            </label>
            <input
              id="instagram"
              type="url"
              required
              placeholder="https://www.instagram.com/name"
              value={ig}
              onChange={(e) => setIg(e.target.value)}
              disabled={busy}
            />
            {error && (
              <div className="notice error" role="alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
            {waitingForModel && !error && (
              <div className="notice waiting" role="status">
                <LoaderCircle className="spin" size={16} />
                <span>
                  {job?.error || "The model is busy. Your progress is saved."}
                  <small>
                    We’ll continue this step automatically when the model is
                    available.
                  </small>
                </span>
              </div>
            )}
            <button
              className="button primary full"
              disabled={busy}
              type="submit"
            >
              {busy ? (
                <>
                  <LoaderCircle className="spin" size={16} />{" "}
                  {waitingForModel
                    ? "Waiting for the model…"
                    : "Reading their story…"}
                </>
              ) : (
                <>
                  Read the profiles <ArrowRight size={17} />
                </>
              )}
            </button>
            {error && jobId && (
              <button
                className="button secondary full"
                type="button"
                onClick={retry}
              >
                Retry saved step <RefreshCw size={15} />
              </button>
            )}
          </form>
          {job && (
            <div className="job-progress" aria-live="polite">
              {[
                ["queued", "Links received"],
                ["reading", "Reading both profiles"],
                ["analyzing", "Finding the meaningful details"],
                ["complete", "Your agent is ready"],
              ].map(([key, label], i) => (
                <div
                  className={
                    stages.indexOf(job.stage) > i
                      ? "done"
                      : job.stage === key
                        ? "current"
                        : ""
                  }
                  key={key}
                >
                  <span>
                    {stages.indexOf(job.stage) > i ? (
                      <Check size={13} />
                    ) : job.stage === key && busy ? (
                      <LoaderCircle className="spin" size={13} />
                    ) : (
                      i + 1
                    )}
                  </span>
                  {label}
                </div>
              ))}
            </div>
          )}
          <p className="form-footnote">
            <ShieldCheck size={15} /> Unsupported personal preferences remain
            unknown. Progress is saved while the profiles are read.
          </p>
        </div>
      </section>
    </>
  );
}
const DATE_SCENES: Record<
  string,
  { title: string; description: string; detail: string; icon: typeof BookOpen }
> = {
  "First coffee": {
    title: "A quiet corner, two cups.",
    description:
      "An imagined café with a window seat and time to follow an interesting question.",
    detail: "Fictional setting · a first conversation",
    icon: MessageCircle,
  },
  "A weekend afternoon": {
    title: "An afternoon without a hurry.",
    description:
      "An imagined bookshop and a nearby café, with room for a shared discovery or a different point of view.",
    detail: "Fictional setting · a little more time",
    icon: BookOpen,
  },
  "Something new": {
    title: "A little outside the familiar.",
    description:
      "An imagined small gallery where an unexpected work can give both agents something to notice.",
    detail: "Fictional setting · a shared discovery",
    icon: Sparkles,
  },
};
function SourceConnections({ person, ids }: { person: Person; ids: string[] }) {
  const evidence = person.evidence.filter((e) => ids.includes(e.id));
  if (!evidence.length) return null;
  return (
    <details className="message-evidence">
      <summary>
        <Link2 size={12} />
        {evidence.length} source{" "}
        {evidence.length === 1 ? "connection" : "connections"}
        <ChevronDown size={12} />
      </summary>
      {evidence.map((e) => (
        <a key={e.id} href={e.url} target="_blank" rel="noreferrer">
          {e.platform === "linkedin" ? (
            <Linkedin size={12} />
          ) : (
            <Instagram size={12} />
          )}
          <span>
            {e.text.slice(0, 150)}
            {e.text.length > 150 ? "…" : ""}
          </span>
          <ArrowUpRight size={12} />
        </a>
      ))}
    </details>
  );
}
function Dates({
  people,
  dates,
  dateId,
  withPersonId,
  resumeRequested = false,
  refresh,
}: {
  people: Person[];
  dates: DateSession[];
  dateId?: string;
  withPersonId?: string;
  resumeRequested?: boolean;
  refresh: () => Promise<void>;
}) {
  const initial = people.find((p) => p.id === withPersonId) || people[0];
  const [aId, setA] = useState(initial?.id || ""),
    [bId, setB] = useState(people.find((p) => p.id !== initial?.id)?.id || "");
  const [scenario, setScenario] = useState("First coffee"),
    [date, setDate] = useState<DateSession | null>(null);
  const [busy, setBusy] = useState(false),
    [starting, setStarting] = useState(false),
    [loadingDate, setLoadingDate] = useState(!!dateId),
    [error, setError] = useState("");
  const [auto, setAuto] = useState(true),
    [replaying, setReplaying] = useState(false),
    [visible, setVisible] = useState(4),
    [speed, setSpeed] = useState(1);
  const routeVersion = useRef(0),
    selectionApplied = useRef("");
  const conversationRef = useRef<HTMLElement | null>(null),
    scrollAfterStart = useRef<string | null>(null);
  useEffect(() => {
    if (!withPersonId) {
      selectionApplied.current = "";
      return;
    }
    if (
      dateId ||
      selectionApplied.current === withPersonId ||
      !people.some((p) => p.id === withPersonId)
    )
      return;
    selectionApplied.current = withPersonId;
    setA(withPersonId);
    setB((current) =>
      current !== withPersonId && people.some((p) => p.id === current)
        ? current
        : people.find((p) => p.id !== withPersonId)?.id || "",
    );
  }, [withPersonId, dateId, people]);
  useEffect(() => {
    const version = ++routeVersion.current;
    setReplaying(false);
    setVisible(4);
    setAuto(true);
    setError("");
    setBusy(false);
    setDate(null);
    setLoadingDate(!!dateId);
    if (!dateId) return;
    async function load() {
      try {
        const current = await api<DateSession>("/dates/" + dateId);
        if (version !== routeVersion.current) return;
        setDate(current);
        if (resumeRequested && !current.demo && current.status === "failed") {
          setBusy(true);
          const resumed = await api<DateSession>(
            "/dates/" + current.id + "/advance",
            {},
          );
          if (version !== routeVersion.current) return;
          setDate(resumed);
          void refresh();
        }
      } catch (e) {
        if (version === routeVersion.current) {
          setError((e as Error).message);
          setAuto(false);
        }
      } finally {
        if (version === routeVersion.current) {
          setLoadingDate(false);
          setBusy(false);
        }
      }
    }
    void load();
    return () => {
      routeVersion.current++;
    };
  }, [dateId, resumeRequested, refresh]);
  useEffect(() => {
    if (
      !date ||
      date.demo ||
      date.status !== "running" ||
      !auto ||
      busy ||
      loadingDate
    )
      return;
    const version = routeVersion.current;
    const timer = setTimeout(
      async () => {
        setBusy(true);
        try {
          const next = await api<DateSession>(
            "/dates/" + date.id + "/advance",
            {},
          );
          // An in-flight turn still appears after Pause; changing the selected date discards stale responses.
          if (version === routeVersion.current) {
            setDate(next);
            if (next.status === "complete") void refresh();
          }
        } catch (e) {
          if (version === routeVersion.current) {
            setError((e as Error).message);
            setAuto(false);
            try {
              const saved = await api<DateSession>("/dates/" + date.id);
              if (version === routeVersion.current) setDate(saved);
            } catch {
              /* Keep the last readable conversation. */
            }
            void refresh();
          }
        } finally {
          if (version === routeVersion.current) setBusy(false);
        }
      },
      Math.min(
        300000,
        Math.max(
          600,
          (date.retryAt ? Date.parse(date.retryAt) - Date.now() : 0) || 0,
        ),
      ),
    );
    return () => clearTimeout(timer);
  }, [date, auto, busy, loadingDate, refresh]);
  useEffect(() => {
    if (loadingDate || !date || scrollAfterStart.current !== date.id) return;
    scrollAfterStart.current = null;
    if (window.matchMedia("(max-width: 720px)").matches)
      conversationRef.current?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
  }, [date?.id, loadingDate]);
  useEffect(() => {
    if (!replaying || !date) return;
    if (visible >= date.messages.length) {
      setReplaying(false);
      return;
    }
    const timer = setTimeout(() => setVisible((v) => v + 1), 2800 / speed);
    return () => clearTimeout(timer);
  }, [replaying, visible, speed, date]);
  const a = people.find((p) => p.id === (date?.aId || aId)),
    b = people.find((p) => p.id === (date?.bId || bId));
  const samePerson = !!aId && aId === bId;
  const canStart = !!aId && !!bId && !samePerson && !busy && !starting;
  async function start() {
    if (!canStart) return;
    setStarting(true);
    setError("");
    try {
      const next = await api<DateSession>("/dates", { aId, bId, scenario });
      scrollAfterStart.current = next.id;
      go("dates/" + next.id);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  }
  async function retry() {
    if (!date || busy) return;
    const version = routeVersion.current;
    setBusy(true);
    setError("");
    try {
      const next = await api<DateSession>("/dates/" + date.id + "/advance", {});
      if (version === routeVersion.current) {
        setDate(next);
        setAuto(true);
        void refresh();
      }
    } catch (e) {
      if (version === routeVersion.current) {
        setError((e as Error).message);
        setAuto(false);
      }
    } finally {
      if (version === routeVersion.current) setBusy(false);
    }
  }
  function openUnfinished(item: DateSession) {
    if (item.id === date?.id) {
      if (item.status === "failed") void retry();
      else setAuto(true);
    } else
      go("dates/" + item.id + (item.status === "failed" ? "?resume=1" : ""));
  }
  function toggleReplay() {
    if (!date) return;
    if (replaying) setReplaying(false);
    else {
      if (visible >= date.messages.length) setVisible(0);
      setReplaying(true);
    }
  }
  const currentDates = date
    ? [date, ...dates.filter((d) => d.id !== date.id)]
    : dates;
  const saved = currentDates.filter((d) => d.status === "complete");
  const unfinished = currentDates.filter(
    (d) => !d.demo && d.status !== "complete",
  );
  const scene =
    DATE_SCENES[date?.scenario || scenario] || DATE_SCENES["First coffee"];
  const SceneIcon = scene.icon;
  const displayedTurns =
    date?.status === "complete"
      ? Math.min(visible, date.messages.length)
      : date?.messages.length || 0;
  const displayedPerspectives =
    date?.status === "complete" && visible < date.messages.length
      ? 0
      : date?.assessments.length || 0;
  const progress = displayedTurns + displayedPerspectives;
  const replayLabel = replaying
    ? "Pause replay"
    : date && visible < date.messages.length
      ? "Resume replay"
      : "Replay date";
  const waitingForModel = date?.status === "running" && !!date.retryAt;
  const fatalError = error || (!waitingForModel ? date?.error : "");
  return (
    <>
      <section className="compact-intro">
        <div>
          <span className="eyebrow">THE CONVERSATION IS THE CONNECTION</span>
          <h1>
            A table for <em>two agents.</em>
          </h1>
          <p>Watch an idea become a conversation. See where it takes them.</p>
        </div>
        <div className="counter-label">
          <MessageCircle size={18} />
          <b>{saved.length}</b> completed dates
        </div>
      </section>
      <div className="dates-layout">
        <aside className="date-sidebar">
          <span className="eyebrow">SET THE SCENE</span>
          <h3>Who’s meeting?</h3>
          <label className="form-label" htmlFor="date-first-agent">
            First agent
          </label>
          <select
            id="date-first-agent"
            value={aId}
            onChange={(e) => setA(e.target.value)}
            disabled={starting}
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <label className="form-label" htmlFor="date-second-agent">
            Second agent
          </label>
          <select
            id="date-second-agent"
            value={bId}
            onChange={(e) => setB(e.target.value)}
            aria-invalid={samePerson}
            aria-describedby="date-pair-help"
            disabled={starting}
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p
            id="date-pair-help"
            className={`pair-help ${samePerson ? "invalid" : ""}`}
            aria-live="polite"
          >
            {samePerson
              ? "Choose two different people so their agents can meet."
              : "Each agent brings their own perspective."}
          </p>
          <label className="form-label" htmlFor="date-scenario">
            A little context
          </label>
          <select
            id="date-scenario"
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            disabled={starting}
          >
            {Object.keys(DATE_SCENES).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            className="button primary full"
            disabled={!canStart}
            onClick={start}
          >
            {starting ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <Sparkles size={15} />
            )}{" "}
            {starting
              ? "Setting the table…"
              : date
                ? "Start a new live date"
                : "Start a live date"}
          </button>
          <p className="tiny muted">
            Four conversation turns. Two independent perspectives. Progress is
            saved after every step.
          </p>
          {unfinished.length > 0 && (
            <>
              <div className="saved-heading">
                <span className="eyebrow">PICK UP THE CONVERSATION</span>
                <span>{unfinished.length}</span>
              </div>
              <div className="saved-list unfinished-list">
                {unfinished.map((d) => {
                  const x = people.find((p) => p.id === d.aId),
                    y = people.find((p) => p.id === d.bId);
                  if (!x || !y) return null;
                  return (
                    <button
                      key={d.id}
                      className={dateId === d.id ? "selected" : ""}
                      onClick={() => openUnfinished(d)}
                      disabled={busy && dateId === d.id}
                      aria-label={`${d.status === "failed" ? "Retry" : "Resume"} ${x.name} and ${y.name}'s date`}
                    >
                      <span>
                        <b>
                          {x.name.split(" ")[0]} & {y.name.split(" ")[0]}
                        </b>
                        <small>
                          {d.messages.length}/4 turns · {d.assessments.length}/2
                          perspectives
                        </small>
                      </span>
                      <span
                        className={`resume-status ${d.status === "failed" ? "failed" : ""}`}
                      >
                        {d.status === "failed" ? (
                          <RefreshCw size={12} />
                        ) : (
                          <Play size={12} />
                        )}{" "}
                        {d.status === "failed" ? "Retry" : "Resume"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <div className="saved-heading">
            <span className="eyebrow">PAST CONVERSATIONS</span>
            <span>{saved.length}</span>
          </div>
          <div className="saved-list">
            {saved.map((d) => {
              const x = people.find((p) => p.id === d.aId),
                y = people.find((p) => p.id === d.bId);
              if (!x || !y) return null;
              return (
                <button
                  key={d.id}
                  className={dateId === d.id ? "selected" : ""}
                  onClick={() => go("dates/" + d.id)}
                  aria-label={`Open ${x.name} and ${y.name}'s completed date`}
                >
                  <div className="paired-avatars">
                    <Avatar p={x} size="tiny" />
                    <Avatar p={y} size="tiny" />
                  </div>
                  <span>
                    <b>
                      {x.name.split(" ")[0]} & {y.name.split(" ")[0]}
                    </b>
                    <small>{d.scenario}</small>
                  </span>
                  <ChevronRight size={14} />
                </button>
              );
            })}
            {!saved.length && (
              <p className="tiny muted">
                Your completed dates will be saved here.
              </p>
            )}
          </div>
        </aside>
        <section
          className="date-room"
          aria-label="Agent conversation"
          ref={conversationRef}
        >
          {loadingDate ? (
            <div className="loading-page" role="status">
              <LoaderCircle className="spin" />
              <p>Opening the conversation…</p>
            </div>
          ) : a && b ? (
            <>
              <div className="date-participants">
                <button
                  onClick={() => go("person/" + a.id)}
                  aria-label={`Read ${a.name}'s profile`}
                >
                  <Avatar p={a} />
                  <span>
                    <b>{a.name}</b>
                    <small>
                      {a.traits[0]?.label || "Curious by nature"}
                      <span>·</span>Agent
                    </small>
                  </span>
                </button>
                <div className="table-heart">
                  <Heart size={23} />
                </div>
                <button
                  onClick={() => go("person/" + b.id)}
                  aria-label={`Read ${b.name}'s profile`}
                >
                  <Avatar p={b} />
                  <span>
                    <b>{b.name}</b>
                    <small>
                      {b.traits[0]?.label || "Curious by nature"}
                      <span>·</span>Agent
                    </small>
                  </span>
                </button>
              </div>
              <div className="date-scene">
                <span>
                  <span
                    className={`status-dot ${date?.status === "running" && auto && !date.demo && !waitingForModel ? "pulsing" : ""}`}
                  />
                  {date
                    ? date.status === "complete"
                      ? "SAVED CONVERSATION"
                      : date.status === "failed"
                        ? "PROGRESS SAVED"
                        : !auto
                          ? "CONVERSATION PAUSED"
                          : waitingForModel
                            ? "WAITING TO CONTINUE"
                            : "LIVE CONVERSATION"
                    : "THE TABLE IS READY"}
                </span>
                <span>
                  {date?.scenario || scenario}
                  {date && (
                    <>
                      {" "}
                      ·{" "}
                      {date.engine === "groq"
                        ? "AI agents"
                        : "Rule-based agents"}
                    </>
                  )}
                </span>
              </div>
              <div className="scene-atmosphere">
                <span className="scene-illustration" aria-hidden="true">
                  <SceneIcon size={25} />
                </span>
                <div>
                  <span className="scene-caption">{scene.detail}</span>
                  <h3>{scene.title}</h3>
                  <p>
                    {scene.description} Scene details are illustrative; the
                    conversation below is generated.
                  </p>
                </div>
              </div>
              {waitingForModel && !error && (
                <div className="notice waiting" role="status">
                  {auto ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <Pause size={17} />
                  )}
                  <span>
                    {date?.error ||
                      "The model is busy. Your progress is saved."}
                    <small>
                      {auto
                        ? "The agents will continue automatically from this step."
                        : "The conversation is paused. Resume when you’re ready."}
                    </small>
                  </span>
                </div>
              )}
              {fatalError && (
                <div className="notice error" role="alert">
                  <AlertCircle size={17} />
                  <span>{fatalError}</span>
                  {date && !date.demo && (
                    <button onClick={retry} disabled={busy}>
                      {busy ? "Retrying…" : "Retry saved step"}
                    </button>
                  )}
                </div>
              )}
              {date ? (
                <>
                  <div className="date-progress">
                    <div className="date-progress-label" aria-live="polite">
                      <span>{displayedTurns} of 4 turns</span>
                      <span>{displayedPerspectives} of 2 perspectives</span>
                    </div>
                    <div
                      className="date-progress-track"
                      role="progressbar"
                      aria-label="Date progress: four conversation turns and two perspectives"
                      aria-valuemin={0}
                      aria-valuemax={6}
                      aria-valuenow={progress}
                      aria-valuetext={`${displayedTurns} of four turns, ${displayedPerspectives} of two perspectives`}
                    >
                      {Array.from({ length: 6 }, (_, i) => (
                        <span
                          className={`${i < progress ? "filled" : ""} ${i >= 4 ? "perspective" : ""}`}
                          key={i}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="conversation">
                    {date.messages.slice(0, visible).map((m, i) => {
                      const speaker = m.personId === a.id ? a : b;
                      return (
                        <article
                          className={`message ${m.personId === b.id ? "right" : ""}`}
                          key={m.id}
                        >
                          <Avatar p={speaker} size="tiny" />
                          <div>
                            <div className="message-meta">
                              <b>{speaker.name.split(" ")[0]}'s agent</b>
                              <span>
                                {String(i + 1).padStart(2, "0")} · {m.stage}
                              </span>
                            </div>
                            <div className="bubble">
                              <p>{m.text}</p>
                              <SourceConnections
                                person={speaker}
                                ids={m.evidenceIds}
                              />
                            </div>
                          </div>
                        </article>
                      );
                    })}
                    {date.status === "running" && !date.demo && (
                      <div className="thinking" role="status">
                        {auto ? (
                          <LoaderCircle className="spin" size={16} />
                        ) : (
                          <Pause size={16} />
                        )}
                        <span>
                          {!auto
                            ? busy
                              ? "Pausing after the current step. Your progress is saved."
                              : "Paused. Resume whenever you’re ready."
                            : waitingForModel
                              ? "Waiting to continue from the saved step…"
                              : date.messages.length < 4
                                ? `${(date.messages.length % 2 === 0 ? a : b).name.split(" ")[0]}'s agent is considering the conversation…`
                                : `Forming perspective ${Math.min(2, date.assessments.length + 1)} of 2…`}
                        </span>
                        <button
                          className="quiet"
                          onClick={() => setAuto((current) => !current)}
                          aria-label={
                            auto
                              ? "Pause after the current agent step"
                              : "Resume the live conversation"
                          }
                          title={
                            auto
                              ? "Pause after this step"
                              : "Resume conversation"
                          }
                        >
                          {auto ? <Pause size={15} /> : <Play size={15} />}
                          <span>{auto ? "Pause" : "Resume"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                  {date.status === "complete" &&
                    visible >= date.messages.length && (
                      <div className="verdicts">
                        <div className="verdict-heading">
                          <span className="eyebrow">
                            TWO SEPARATE IMPRESSIONS
                          </span>
                          <span>
                            <CheckCheck size={13} /> Date complete
                          </span>
                        </div>
                        <div className="verdict-grid">
                          {date.assessments.map((v) => {
                            const person = people.find(
                              (p) => p.id === v.personId,
                            );
                            if (!person) return null;
                            return (
                              <article className="verdict" key={v.personId}>
                                <div className="verdict-person">
                                  <span>
                                    {person.name.split(" ")[0]}'s agent
                                  </span>
                                  <span className={`decision ${v.decision}`}>
                                    {v.decision === "explore"
                                      ? "Worth exploring"
                                      : v.decision === "maybe"
                                        ? "Curious, with questions"
                                        : "Limited fit"}
                                  </span>
                                </div>
                                <div
                                  className={`verdict-delta ${v.delta < 0 ? "negative" : ""}`}
                                >
                                  <strong>
                                    {v.delta >= 0 ? "+" : ""}
                                    {v.delta}
                                  </strong>
                                  <span>
                                    fit adjustment
                                    <br />
                                    from this agent’s perspective
                                  </span>
                                </div>
                                <ul className="verdict-reasons">
                                  {v.reasons.map((reason, i) => (
                                    <li key={i}>{reason}</li>
                                  ))}
                                </ul>
                                {v.unknowns.length > 0 && (
                                  <div className="verdict-unknowns">
                                    <h4>Still to explore</h4>
                                    <ul>
                                      {v.unknowns.map((unknown, i) => (
                                        <li key={i}>{unknown}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                <SourceConnections
                                  person={person}
                                  ids={v.evidenceIds}
                                />
                                <button
                                  className="verdict-matches"
                                  onClick={() => go("rankings/" + person.id)}
                                >
                                  See {person.name.split(" ")[0]}’s matches{" "}
                                  <ArrowRight size={13} />
                                </button>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  <div className="conversation-toolbar">
                    <span>
                      <ShieldCheck size={13} /> A simulation, not the people’s
                      own words.
                    </span>
                    {date.status === "complete" && (
                      <div>
                        <button
                          className="quiet"
                          onClick={toggleReplay}
                          aria-label={replayLabel}
                        >
                          {replaying ? <Pause size={14} /> : <Play size={14} />}{" "}
                          {replayLabel}
                        </button>
                        <button
                          className="speed"
                          onClick={() =>
                            setSpeed((current) => (current === 1 ? 2 : 1))
                          }
                          aria-label={`Replay speed ${speed} times. Switch to ${speed === 1 ? 2 : 1} times.`}
                        >
                          {speed}×
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="date-welcome">
                  <div className="coffee-art" aria-hidden="true">
                    <span>☕</span>
                    <span>☕</span>
                  </div>
                  <h2>
                    Good conversations
                    <br />
                    <em>start somewhere.</em>
                  </h2>
                  <p>
                    Choose two agents and a scene. They’ll draw on their
                    profiles, respond to each other, and explore the fit.
                  </p>
                  <button
                    className="text-link"
                    disabled={!canStart}
                    onClick={start}
                  >
                    Let them meet <ArrowRight size={17} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <Empty title="Two people make a conversation">
              Add verified profiles to start a date.
            </Empty>
          )}
        </section>
      </div>
    </>
  );
}
function Rankings({
  people,
  personId,
  dates,
}: {
  people: Person[];
  personId?: string;
  dates: DateSession[];
}) {
  const p = people.find((p) => p.id === personId) || people[0];
  const [rankings, setRankings] = useState<Ranking[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {
    if (!p) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setExpanded(null);
    api<Ranking[]>("/people/" + p.id + "/rankings")
      .then((next) => {
        if (!cancelled) setRankings(next);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [p?.id, dates]);
  if (!p)
    return (
      <Empty title="A connection starts with a profile">
        Add a person to explore their matches.
      </Empty>
    );
  const top = rankings[0],
    topPerson = people.find((x) => x.id === top?.personId);
  const totalDates = dates.filter(
    (d) => d.status === "complete" && (d.aId === p.id || d.bId === p.id),
  ).length;
  return (
    <>
      <section className="compact-intro">
        <div>
          <span className="eyebrow">A LITTLE COMMON GROUND</span>
          <h1>
            Connection, <em>with context.</em>
          </h1>
          <p>
            What fits. What’s still a question. And the conversation behind it.
          </p>
        </div>
        <div className="ranking-person-select">
          <Avatar p={p} size="small" />
          <select
            aria-label="Whose matches"
            value={p.id}
            onChange={(e) => go("rankings/" + e.target.value)}
          >
            {people.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}'s matches
              </option>
            ))}
          </select>
        </div>
      </section>
      {error && <div className="notice error">{error}</div>}
      <div className="ranking-layout">
        <aside className="ranking-aside">
          <Avatar p={p} size="large" />
          <span className="eyebrow">THROUGH THEIR AGENT'S EYES</span>
          <h2>{p.name}</h2>
          <p>{p.summary}</p>
          <div className="tags">
            {p.traits.slice(0, 4).map((t) => (
              <Tag key={t.label}>{t.label}</Tag>
            ))}
          </div>
          <button className="text-link" onClick={() => go("person/" + p.id)}>
            Read the profile <ArrowUpRight size={15} />
          </button>
          <div className="rank-stats">
            <div>
              <b>{rankings.length}</b>
              <span>people considered</span>
            </div>
            <div>
              <b>{totalDates}</b>
              <span>dates completed</span>
            </div>
          </div>
          <div className="ranking-method">
            <Info size={17} />
            <p>
              Scores describe a simulated fit. Undated comparisons are
              preliminary. Missing evidence means uncertainty, not
              incompatibility.
            </p>
          </div>
        </aside>
        <section>
          {loading ? (
            <div className="loading-page">
              <LoaderCircle className="spin" />
            </div>
          ) : (
            <>
              {top && topPerson && (
                <article className="top-match">
                  <div className="top-match-label">
                    <span>
                      <Sparkles size={14} /> A CONNECTION TO EXPLORE
                    </span>
                    <span>01</span>
                  </div>
                  <div className="top-match-content">
                    <Avatar p={topPerson} size="large" />
                    <div>
                      <h2>{topPerson.name}</h2>
                      <p>{topPerson.headline}</p>
                      <div className="tags">
                        {top.shared.map((t) => (
                          <Tag key={t}>{t}</Tag>
                        ))}
                      </div>
                    </div>
                    <div className="match-score">
                      <strong>{top.score}</strong>
                      <span>FIT INDEX / 100</span>
                    </div>
                  </div>
                  <p className="match-reason">{top.reasons[0]}</p>
                  <div className="top-match-footer">
                    <span>
                      <span className="status-dot" />
                      {top.dateId
                        ? "Date completed"
                        : "Profile comparison"} · {top.confidence.toLowerCase()}{" "}
                      evidence
                    </span>
                    <button
                      onClick={() =>
                        go(
                          top.dateId
                            ? "dates/" + top.dateId
                            : "person/" + topPerson.id,
                        )
                      }
                    >
                      {top.dateId
                        ? "Read their conversation"
                        : "Meet their agent"}
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                </article>
              )}
              <div className="ranking-list-heading">
                <span>THE FULL PICTURE</span>
                <span>{rankings.length} possible connections</span>
              </div>
              <div className="ranking-list">
                {rankings.map((r) => {
                  const other = people.find((x) => x.id === r.personId)!;
                  return (
                    <article className="ranking-row" key={r.personId}>
                      <button
                        className="ranking-row-main"
                        onClick={() =>
                          setExpanded(
                            expanded === r.personId ? null : r.personId,
                          )
                        }
                        aria-expanded={expanded === r.personId}
                      >
                        <span className="rank-number">
                          {String(r.rank).padStart(2, "0")}
                        </span>
                        <Avatar p={other} size="small" />
                        <span className="rank-name">
                          <b>{other.name}</b>
                          <small>
                            {r.shared.length
                              ? r.shared.slice(0, 2).join(" · ")
                              : "Different interests to explore"}
                          </small>
                        </span>
                        <span
                          className={`ranking-status ${r.dateId ? "dated" : ""}`}
                        >
                          {r.dateId ? (
                            <>
                              <CheckCheck size={12} /> Met
                            </>
                          ) : (
                            <>Not yet met</>
                          )}
                        </span>
                        <span className="rank-score">
                          {r.score}
                          <small>/100</small>
                        </span>
                        <ChevronDown
                          size={15}
                          className={expanded === r.personId ? "rotate" : ""}
                        />
                      </button>
                      {expanded === r.personId && (
                        <div className="ranking-detail">
                          <div>
                            <span className="eyebrow">WHY THIS CONNECTION</span>
                            {r.reasons.map((x) => (
                              <p key={x}>{x}</p>
                            ))}
                          </div>
                          <div>
                            <span className="eyebrow">STILL TO EXPLORE</span>
                            {r.unknowns.map((x) => (
                              <p key={x}>{x}</p>
                            ))}
                            <div className="score-breakdown">
                              Profile {r.baseScore}{" "}
                              <span>
                                {r.dateId
                                  ? `${r.dateDelta >= 0 ? "+" : ""}${r.dateDelta} after the date`
                                  : "· preliminary"}
                              </span>
                            </div>
                          </div>
                          <div className="rank-detail-actions">
                            <button
                              className="text-link"
                              onClick={() => go("person/" + other.id)}
                            >
                              View profile <ArrowUpRight size={13} />
                            </button>
                            {r.dateId && (
                              <button
                                className="text-link"
                                onClick={() => go("dates/" + r.dateId)}
                              >
                                Read the date <ArrowRight size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
