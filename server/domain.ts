import type {
  Evidence,
  Person,
  Trait,
  DateSession,
  Assessment,
  Ranking,
} from "../src/types";
export const COLORS = ["sage", "rose", "ochre", "slate", "clay", "lavender"];
export const TOPICS: Record<
  string,
  { words: RegExp; category: Trait["category"] }
> = {
  Entrepreneurship: {
    words:
      /\b(entrepreneur|founder|startup|start-up|business owner|building businesses)\b/i,
    category: "interest",
  },
  Writing: {
    words:
      /\b(author|writer|writing|bestselling|best-selling|book|storytelling|poet|poetry)\b/i,
    category: "hobby",
  },
  Design: {
    words:
      /\b(design|designer|ux|ui|typography|creative director|creative studio)\b/i,
    category: "interest",
  },
  Technology: {
    words:
      /\b(software|engineer|developer|coding|technology|tech|artificial intelligence|AI)\b/i,
    category: "interest",
  },
  Travel: {
    words:
      /\b(travel|traveller|traveler|backpack|exploring the world|wanderlust)\b/i,
    category: "hobby",
  },
  Food: {
    words:
      /\b(chef|cooking|food|culinary|recipe|baking|baker|cuisine|restaurant)\b/i,
    category: "hobby",
  },
  Photography: {
    words:
      /\b(photograph|photographer|photography|visual storytelling|filmmaker|filmmaking|cinematograph)\b/i,
    category: "hobby",
  },
  Learning: {
    words:
      /\b(educator|education|teaching|teacher|learning|mentor|educational|educate)\b/i,
    category: "priority",
  },
  Wellbeing: {
    words:
      /\b(wellness|wellbeing|well-being|mindfulness|meditation|yoga|fitness)\b/i,
    category: "hobby",
  },
  Outdoors: {
    words:
      /\b(hiking|trekking|mountain|mountaineer|climbing|outdoors|nature|wildlife|adventure)\b/i,
    category: "hobby",
  },
  Music: {
    words: /\b(music|musician|singer|singing|guitar|piano|songwriter)\b/i,
    category: "hobby",
  },
  Art: {
    words: /\b(artist|art|painting|illustrator|illustration|sculpture)\b/i,
    category: "hobby",
  },
  Conversation: {
    words: /\b(podcast|podcaster|interview|speaker|speaking|host)\b/i,
    category: "interest",
  },
  "Personal growth": {
    words:
      /\b(productivity|personal growth|self-improvement|motivation|motivational|self growth)\b/i,
    category: "priority",
  },
  Storytelling: {
    words:
      /\b(storytelling|stories|content creator|content creation|creator|journalist|journalism)\b/i,
    category: "interest",
  },
  Sustainability: {
    words: /\b(sustainability|sustainable|environment|climate|conservation)\b/i,
    category: "priority",
  },
  Running: {
    words: /\b(running|runner|marathon|triathlon|cycling|cyclist|athlete)\b/i,
    category: "hobby",
  },
};
export const ACTIVITIES = [
  {
    id: "gallery",
    name: "a small gallery and a coffee",
    tags: ["Art", "Design", "Photography"],
    icon: "frame",
  },
  {
    id: "bookshop",
    name: "a bookshop wander and a coffee",
    tags: ["Writing", "Learning", "Personal growth"],
    icon: "book",
  },
  {
    id: "market",
    name: "a food market and a shared tasting",
    tags: ["Food", "Travel", "Conversation"],
    icon: "coffee",
  },
  {
    id: "walk",
    name: "a relaxed walk with a photo stop",
    tags: ["Outdoors", "Photography", "Travel", "Running"],
    icon: "leaf",
  },
  {
    id: "ideas",
    name: "a café conversation about a project",
    tags: ["Entrepreneurship", "Technology", "Design", "Learning", "Finance"],
    icon: "spark",
  },
  {
    id: "music",
    name: "an acoustic set at a small café",
    tags: ["Music", "Art", "Storytelling"],
    icon: "music",
  },
  {
    id: "garden",
    name: "a botanical garden and a tea",
    tags: ["Wellbeing", "Sustainability", "Outdoors", "Gardening"],
    icon: "leaf",
  },
];
// Canonical topics are used only for comparison. Original labels and citations
// remain on the profile. Specific compounds are checked before broad words:
// food photography describes photography, not a demonstrated love of cooking.
const TOPIC_ALIASES: [string, RegExp][] = [
  [
    "Photography",
    /\b(photograph\w*|videograph\w*|film\w*|cinematograph\w*|visual storytelling)\b/,
  ],
  ["Finance", /\b(financ\w*|invest\w*|asset management)\b/],
  ["Design", /\b(design\w*|ux|ui|typography|creative direction)\b/],
  [
    "Storytelling",
    /\b(storytell\w*|content creat\w*|digital content|youtube|social media|journalis\w*)\b/,
  ],
  ["Marketing", /\b(marketing|brand communications?|influencer management)\b/],
  ["Writing", /\b(writ\w*|author\w*|poetry|poet|books?|publishing)\b/],
  ["Travel", /\b(travel\w*|local exploration|culture.*exploration)\b/],
  ["Food", /\b(food|cook\w*|culinary|baking|cuisine|chef)\b/],
  ["Learning", /\b(learn\w*|educat\w*|up skilling|mentor\w*|teaching)\b/],
  [
    "Wellbeing",
    /\b(wellbeing|well being|wellness|fitness|health|yoga|meditation)\b/,
  ],
  ["Running", /\b(running|runner|marathon|triathlon|cycling|cyclist)\b/],
  [
    "Outdoors",
    /\b(outdoors?|hiking|trekking|climbing|adventure|wildlife|nature)\b/,
  ],
  ["Gardening", /\b(garden\w*)\b/],
  ["Music", /\b(music\w*|singing|singer|songwrit\w*|guitar|piano)\b/],
  ["Art", /\b(arts?|artist\w*|paint\w*|illustrat\w*|sculpt\w*|curating)\b/],
  ["Conversation", /\b(podcast\w*|public speaking|interview\w*)\b/],
  [
    "Personal growth",
    /\b(personal growth|self improvement|self reflection|productivity|motivation|inspiration)\b/,
  ],
  ["Sustainability", /\b(sustainab\w*|conservation|climate|off grid)\b/],
  ["Entrepreneurship", /\b(entrepreneur\w*|founder|startups?|business)\b/],
  ["Leadership", /\b(leadership|team management)\b/],
  [
    "Technology",
    /\b(technology|tech|software|coding|engineering|artificial intelligence|ai)\b/,
  ],
  ["Community", /\b(community|volunteer\w*)\b/],
  ["Fashion", /\b(fashion|styling|saree)\b/],
];
const normalizedLabel = (label: string) =>
  label
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‐‑‒–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
export function canonicalTopic(label: string) {
  const normalized = normalizedLabel(label);
  return (
    TOPIC_ALIASES.find(([, pattern]) => pattern.test(normalized))?.[0] ||
    normalized
  );
}
const careerTopics = new Set([
  "Entrepreneurship",
  "Technology",
  "Finance",
  "Marketing",
  "Leadership",
]);
function scoringTopics(p: Person) {
  const topics = new Map<
    string,
    { label: string; weight: number; confidence: Trait["confidence"] }
  >();
  for (const trait of p.traits) {
    const topic = canonicalTopic(trait.label);
    if (!topic) continue;
    const confidence =
      trait.confidence === "high"
        ? 1
        : trait.confidence === "medium"
          ? 0.8
          : 0.55;
    const category =
      trait.category === "hobby"
        ? 1.25
        : trait.category === "priority"
          ? 1.1
          : 1;
    // Broad professional overlap has less weight than a specific shared interest.
    const weight =
      category *
      confidence *
      (trait.status === "tentative" ? 0.65 : 1) *
      (careerTopics.has(topic) ? 0.65 : 1);
    const previous = topics.get(topic);
    if (!previous || weight > previous.weight)
      topics.set(topic, {
        label: TOPIC_ALIASES.some(([label]) => label === topic)
          ? topic
          : trait.label.trim(),
        weight,
        confidence: trait.confidence,
      });
  }
  return topics;
}
export function normalizeUrl(
  input: string,
  platform: "linkedin" | "instagram",
) {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    throw new Error(
      `Enter a valid ${platform === "linkedin" ? "LinkedIn" : "Instagram"} profile URL.`,
    );
  }
  if (u.protocol !== "https:" || u.username || u.password || u.port)
    throw new Error("Use a public HTTPS profile link.");
  const host = u.hostname.toLowerCase();
  const path = u.pathname.replace(/\/+$/, "");
  if (platform === "linkedin") {
    if (
      !/^(www\.|[a-z]{2}\.)?linkedin\.com$/.test(host) ||
      !/^\/in\/[a-zA-Z0-9_%\-]+$/.test(path)
    )
      throw new Error("Use a LinkedIn person profile: linkedin.com/in/name.");
    return `https://www.linkedin.com${path}/`;
  }
  if (
    !["www.instagram.com", "instagram.com"].includes(host) ||
    !/^\/[A-Za-z0-9._]{1,30}$/.test(path) ||
    ["/p", "/reel", "/explore", "/accounts", "/direct", "/stories"].includes(
      path.toLowerCase(),
    )
  )
    throw new Error("Use an Instagram profile link, not a post or reel.");
  return `https://www.instagram.com${path.toLowerCase()}/`;
}
export function slug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}
export function traitsFrom(evidence: Evidence[]): Trait[] {
  return Object.entries(TOPICS)
    .flatMap(([label, { words, category }]) => {
      const matches = evidence.filter((e) => words.test(e.text));
      if (!matches.length) return [];
      return [
        {
          label,
          category: "interest" as const,
          evidenceIds: matches.map((e) => e.id).slice(0, 4),
          confidence: "low" as const,
          status: "tentative" as const,
        },
      ];
    })
    .slice(0, 8);
}
export function makePerson(input: {
  id?: string;
  name: string;
  linkedinUrl: string;
  instagramUrl: string;
  evidence: Evidence[];
  publicVerified: boolean;
  identityVerified: boolean;
  identityNote: string;
  demo?: boolean;
  imageUrl?: string;
}): Person {
  const traits = traitsFrom(input.evidence);
  const li = input.evidence.find((e) => e.platform === "linkedin");
  const ig = input.evidence.find((e) => e.platform === "instagram");
  const id =
    input.id || slug(input.name) + "-" + crypto.randomUUID().slice(0, 6);
  const headline = (li?.text.split(/\n|\. /)[0] || "Public profile").slice(
    0,
    160,
  );
  const sourceStatus = {
    linkedin: !!li,
    instagram: !!ig,
    publicVerified: input.publicVerified,
    identityVerified: input.identityVerified,
  };
  return {
    id,
    name: input.name,
    initials: input.name
      .split(/\s+/)
      .slice(0, 2)
      .map((x) => x[0])
      .join(""),
    headline,
    summary: traits.length
      ? `${input.name.split(" ")[0]}'s public profiles surface ${traits
          .slice(0, 3)
          .map((t) => t.label.toLowerCase())
          .join(
            ", ",
          )}. These are starting points for a conversation; personal relationship needs are not established by the available evidence.`
      : "There is not enough source text to identify interests reliably. This agent will ask open questions instead of inventing preferences.",
    color:
      COLORS[
        [...input.name].reduce((s, c) => s + c.charCodeAt(0), 0) % COLORS.length
      ],
    linkedinUrl: input.linkedinUrl,
    instagramUrl: input.instagramUrl,
    instagramHandle: new URL(input.instagramUrl).pathname.split("/")[1],
    evidence: input.evidence,
    traits,
    unknowns: [
      "Relationship intentions and availability",
      "Romantic preferences",
      "Personal schedule and boundaries",
    ],
    questions: traits
      .slice(0, 3)
      .map(
        (t) =>
          `Would ${t.label.toLowerCase()} be something you enjoy sharing with another person?`,
      ),
    sourceStatus,
    status: Object.values(sourceStatus).every(Boolean) ? "ready" : "incomplete",
    identityNote: input.identityNote,
    createdAt: new Date().toISOString(),
    engine: "grounded-rules",
    demo: input.demo ?? false,
    imageUrl: input.imageUrl,
  };
}
export function profileFit(a: Person, b: Person) {
  const own = scoringTopics(a),
    other = scoringTopics(b);
  const keys = [...own.keys()].filter((key) => other.has(key));
  const total = (topics: ReturnType<typeof scoringTopics>) =>
    [...topics.values()].reduce((sum, t) => sum + t.weight, 0);
  const coverage = (topics: ReturnType<typeof scoringTopics>) =>
    total(topics)
      ? keys.reduce((sum, key) => sum + topics.get(key)!.weight, 0) /
        total(topics)
      : 0;
  // 30 is the baseline, 50 points reflect this person's supported topic coverage,
  // and 10 reflect the other person's coverage. Professional overlap alone is
  // capped at 68: a shared career topic does not establish wider personal fit.
  let score =
    own.size && other.size
      ? Math.round(30 + 50 * coverage(own) + 10 * coverage(other))
      : 0;
  if (keys.length && keys.every((key) => careerTopics.has(key)))
    score = Math.min(score, 68);
  const shared = keys.map((key) => own.get(key)!.label);
  const supported = keys.filter(
    (key) =>
      own.get(key)!.confidence !== "low" &&
      other.get(key)!.confidence !== "low",
  ).length;
  return {
    score: Math.max(0, Math.min(90, score)),
    shared,
    confidence:
      Math.min(a.evidence.length, b.evidence.length) >= 4 && supported >= 2
        ? "Moderate"
        : "Limited",
  };
}
export function activityUtility(p: Person, activityId: string) {
  const act = ACTIVITIES.find((a) => a.id === activityId);
  if (!act) return 0;
  return [...scoringTopics(p)].reduce(
    (sum, [topic, t]) =>
      sum +
      (act.tags.includes(topic)
        ? t.confidence === "high"
          ? 3
          : t.confidence === "medium"
            ? 2
            : 1
        : 0),
    0,
  );
}
export function bestActivity(p: Person) {
  return [...ACTIVITIES].sort(
    (a, b) =>
      activityUtility(p, b.id) - activityUtility(p, a.id) ||
      a.id.localeCompare(b.id),
  )[0];
}
export function rulesTurn(date: DateSession, a: Person, b: Person) {
  const n = date.messages.length;
  const p = n % 2 === 0 ? a : b;
  const other = n % 2 === 0 ? b : a;
  const own = bestActivity(p);
  const prior = date.messages.at(-1)?.proposal;
  const offered = ACTIVITIES.find((x) => x.id === prior) || bestActivity(other);
  const offeredFit = activityUtility(p, offered.id);
  const shared = profileFit(a, b).shared;
  const trait = p.traits.find((t) =>
    own.tags.includes(canonicalTopic(t.label)),
  );
  let text = "";
  let proposal = own.id;
  let stage = "Opening";
  if (n === 0) {
    text = `My profile gives me a starting point in ${trait?.label.toLowerCase() || "learning something new"}. I'd suggest ${own.name}. ${shared.length ? `We both have evidence of ${shared[0].toLowerCase()}; what would you want to explore together?` : "What would make that an interesting first conversation for your person?"}`;
  } else if (n === 1) {
    stage = "Exploring";
    if (offeredFit > 0) {
      proposal = offered.id;
      text = `${offered.name[0].toUpperCase() + offered.name.slice(1)} connects with ${p.traits
        .filter((t) => offered.tags.includes(canonicalTopic(t.label)))
        .map((t) => t.label.toLowerCase())
        .join(
          " and ",
        )} in my profile. I can explore that. Could we each bring one question about what we are making or learning?`;
    } else {
      text = `I can see why that appeals to your agent. My evidence points more toward ${trait?.label.toLowerCase() || "an open conversation"}, so I would propose ${own.name}. Would you be open to adjusting the activity? My person's actual preference is still unknown.`;
    }
  } else if (n === 2) {
    stage = "Adapting";
    proposal = offered.id;
    const changed = offered.id !== date.messages[0].proposal;
    text = changed
      ? `Let's explore your suggestion: ${offered.name}. ${offeredFit > 0 ? "It also connects with interests in my profile." : "I have less evidence that it fits my person, so I would treat it as a question to explore."} We can compare what each of us finds interesting before assuming there is a fit.`
      : `That gives us a concrete plan. During ${offered.name}, I'd ask what part of ${shared[0]?.toLowerCase() || trait?.label.toLowerCase() || "this activity"} your person would most enjoy sharing. Their answer is something these public profiles cannot tell us.`;
  } else {
    stage = "Decision";
    proposal = offered.id;
    text =
      offeredFit > 0
        ? `I would explore that plan in this simulation. ${offered.name[0].toUpperCase() + offered.name.slice(1)} has a connection to my evidence, and you responded to my suggestion. A real next step would still require both people's interest and consent.`
        : `I would keep this as a tentative connection. We negotiated ${offered.name}, but the evidence does not yet establish a strong activity fit for my person. I would ask them before recommending a real date.`;
  }
  const relevant = p.traits
    .filter(
      (t) =>
        ACTIVITIES.find((x) => x.id === proposal)?.tags.includes(
          canonicalTopic(t.label),
        ) || text.toLowerCase().includes(t.label.toLowerCase()),
    )
    .flatMap((t) => t.evidenceIds);
  return {
    id: crypto.randomUUID(),
    personId: p.id,
    text,
    stage,
    evidenceIds: [...new Set(relevant)].slice(0, 4),
    createdAt: new Date().toISOString(),
    proposal,
  };
}
export function rulesAssessment(
  p: Person,
  other: Person,
  date: DateSession,
): Assessment {
  const fit = profileFit(p, other);
  const proposal = date.messages.at(-1)?.proposal || bestActivity(p).id;
  const utility = activityUtility(p, proposal);
  const delta = utility >= 4 ? 8 : utility > 0 ? 4 : -4;
  return {
    personId: p.id,
    score: Math.max(0, Math.min(100, fit.score + delta)),
    delta,
    decision: utility >= 4 ? "explore" : utility > 0 ? "maybe" : "pass",
    reasons: [
      fit.shared.length
        ? `Public evidence overlaps on ${fit.shared.slice(0, 3).join(", ").toLowerCase()}.`
        : "There is little documented overlap; an open conversation would be needed.",
      `The negotiated activity has ${utility > 0 ? "a supported connection" : "no clear connection"} to this agent's profile.`,
      "The result reflects a simulated negotiation, not the real person's romantic preference.",
    ],
    unknowns: [
      "Whether either person wants to date",
      "Whether the proposed activity matches their actual preferences",
    ],
    evidenceIds: [
      ...new Set(
        p.traits
          .filter((t) =>
            fit.shared.some(
              (label) => canonicalTopic(label) === canonicalTopic(t.label),
            ),
          )
          .flatMap((t) => t.evidenceIds),
      ),
    ].slice(0, 4),
  };
}
export function rankingsFor(
  person: Person,
  people: Person[],
  dates: DateSession[],
): Ranking[] {
  return people
    .filter((p) => p.id !== person.id && p.status === "ready")
    .map((p) => {
      const base = profileFit(person, p);
      const matched = dates
        .filter(
          (d) =>
            d.status === "complete" &&
            [d.aId, d.bId].includes(person.id) &&
            [d.aId, d.bId].includes(p.id),
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      const date = matched[0];
      const assessment = date?.assessments.find(
        (a) => a.personId === person.id,
      );
      const delta = assessment?.delta ?? 0;
      return {
        personId: p.id,
        score: Math.max(0, Math.min(100, base.score + delta)),
        baseScore: base.score,
        dateDelta: delta,
        confidence: base.confidence,
        shared: base.shared,
        reasons: assessment?.reasons ?? [
          base.shared.length
            ? `Shared evidence of ${base.shared.slice(0, 3).join(", ").toLowerCase()}.`
            : "Few documented shared interests.",
          "This pair has not completed a date.",
        ],
        unknowns: assessment?.unknowns ?? [
          "Conversation fit has not been explored",
          "Romantic preferences are unknown",
        ],
        dateId: date?.id,
        dateCount: matched.length,
        rank: 0,
      };
    })
    .sort((a, b) => b.score - a.score || a.personId.localeCompare(b.personId))
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
export function scheduleCycle(people: Person[]) {
  const ready = people.filter((p) => p.status === "ready");
  if (ready.length < 2) return [];
  if (ready.length === 2) return [[ready[0].id, ready[1].id]];
  const ordered = [ready[0]];
  const left = ready.slice(1);
  while (left.length) {
    const prev = ordered.at(-1)!;
    left.sort(
      (a, b) =>
        profileFit(prev, b).score - profileFit(prev, a).score ||
        a.id.localeCompare(b.id),
    );
    ordered.push(left.shift()!);
  }
  return ordered.map((p, i) => [p.id, ordered[(i + 1) % ordered.length].id]);
}
