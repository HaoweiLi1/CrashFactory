/**
 * Single source of truth for every paper-derived fact shown on this site.
 *
 * All numbers here are REPORTED BY THE PAPER. They are not measurements taken
 * by this website or re-run locally. Do not add a value here without checking
 * it against the PDF first.
 */

export const paper = {
  /** Exact paper title. The hero renders `name` + `subtitle`, which recombine to this. */
  title:
    'CrashFactory: From Crash Databases to Scalable Safety-Critical Data Synthesis for End-to-End Autonomous Driving',
  name: 'CrashFactory',
  subtitle:
    'From Crash Databases to Scalable Safety-Critical Data Synthesis for End-to-End Autonomous Driving',
  websiteSource: 'https://github.com/HaoweiLi1/CrashFactory',
  status: 'Preprint — not yet peer reviewed',
  ssrn: 'https://ssrn.com/abstract=7288377',
  authors: [
    { name: 'Haowei Li', marks: ['a', '†'] },
    { name: 'Jiawei Wang', marks: ['a', '†'] },
    { name: 'Haowei Sun', marks: ['b'] },
    { name: 'Xintao Yan', marks: ['c', '*'] },
    { name: 'Henry X. Liu', marks: ['a', '*'] },
  ],
  affiliations: [
    { mark: 'a', name: 'Transportation Research Institute, University of Michigan, Ann Arbor, MI, USA' },
    { mark: 'b', name: 'Laplace Intelligence, Ann Arbor, MI, USA' },
    { mark: 'c', name: 'Department of Civil Engineering, The University of Hong Kong, Hong Kong, China' },
  ],
  authorNotes: [
    { mark: '†', text: 'These authors contributed equally to this work.' },
    { mark: '*', text: 'Corresponding authors.' },
  ],
  contacts: ['xintaoy@hku.hk', 'henryliu@umich.edu'],
  keywords: [
    'Autonomous Driving',
    'Safety-Critical Scenario Generation',
    'Traffic Crash Databases',
    'Vision Language Models',
    'End-to-End Autonomous Systems',
  ],
  abstract:
    'Official traffic crash databases document decades of real-world safety-critical events. However, they remain largely unused for autonomous vehicle (AV) safety evaluation due to heterogeneous data formats, multimodal representations, and the absence of sensor-level observations. Existing crash reconstruction methods are mostly tailored to one single database, operate at the trajectory level, or model only the involved vehicles. We propose CrashFactory, a fully automated and agentic framework that converts heterogeneous crash records into executable simulation scenarios with behavioral and sensor-level realism. Each report from crash databases is normalized into a unified grounded evidence package. Then, an LLM/VLM-based multi-agent orchestration system is designed to generate semantically consistent scene descriptions and plausible pre-crash trajectories for both crash-involved participants and surrounding traffic. Such trajectories are further refined by guided behavior diffusion models into crash-consistent yet reactive dynamics, and a driving video foundation model is leveraged to render synchronized surround-view videos. On a balanced 100-case Michigan Traffic Crash Facts benchmark, CrashFactory attains a 100% collision realization rate and 98.0% collision-type consistency, with sub-meter displacement error where roadside ground truth is available. Cross-database generalization is verified on 50 NHTSA CISS cases. CrashFactory establishes a scalable pathway to bridge official crash databases into a reusable corner-case resource for E2E AV testing.',
} as const;

/**
 * The four functional modules of Fig. 1.
 *
 * Naming discipline: the paper writes "four functional agents", but the fourth
 * module's section heading is "Sensor Simulation" with no "Agent" suffix.
 * Keep it exactly as the paper names it.
 */
export const modules = [
  {
    id: 'preprocessing',
    name: 'Preprocessing Agent',
    summary:
      'Normalizes heterogeneous crash records into a unified grounded evidence package.',
    detail:
      'Produces the MapNet, environmental context, street-view or official scene references, the crash description and the crash diagram. Different databases contribute different forms of evidence, so each source is abstracted into one shared representation before any reconstruction happens.',
  },
  {
    id: 'scenario-generation',
    name: 'Scenario Generation Agent',
    summary:
      'Interprets the evidence, reconstructs participants and surrounding traffic, and validates the result.',
    detail:
      'Three sub-agents work in sequence. The Interpretation Agent applies layered chain-of-thought reasoning to recover crash semantics and sparse pre-crash states. The Reconstruction Agent instantiates both the crash-involved participants and the surrounding traffic. The Validation Agent checks the initial scenario against report information, road rules, map constraints and basic physical feasibility.',
  },
  {
    id: 'scenario-refinement',
    name: 'Scenario Refinement Agent',
    summary:
      'Converts the initial scenario into crash-consistent yet reactive joint trajectories.',
    detail:
      'Guided behavior diffusion turns the reconstructed states into joint trajectories that remain consistent with the reported collision while staying reactive between agents, and the final collision outcome is validated.',
  },
  {
    id: 'sensor-simulation',
    name: 'Sensor Simulation',
    summary:
      'Renders the validated scenario into synchronized 360° surround-view driving videos.',
    detail:
      'A driving video foundation model renders synchronized surround-view video from the executable scenario. Outputs are stored together with trajectory, map, metadata and validation records as a corner-case resource for end-to-end AV testing.',
  },
] as const;

/** Experimental configuration, as described in the paper. */
export const setup = [
  { label: 'Scene interpretation', value: 'Gemini 2.5 Pro (multimodal reasoning)' },
  { label: 'Camera rig', value: 'Six synchronized cameras at 24 FPS' },
  { label: 'Front view', value: '704 × 1280, 120 frames (≈5 s)' },
  { label: 'Surrounding views', value: '576 × 1024, 57 frames (≈2.4 s)' },
  { label: 'Rendering model', value: 'Cosmos-Drive' },
  { label: 'Simulation environment', value: 'SUMO road networks' },
] as const;

/** Table 1 — Lane count consistency rate. */
export const tableLaneCount = {
  caption: 'Lane count consistency rate',
  note:
    'NHTSA road-type breakdown is not reported because the CISS records do not categorize road type in the same manner as MTCF.',
  columns: ['Road type', 'Cases', 'Acc (%)', 'Err_lane'],
  groups: [
    {
      name: 'MTCF',
      rows: [
        ['Intersection-related', '55', '63.6', '0.42'],
        ['Non-freeway segment', '39', '71.8', '0.31'],
        ['Freeway', '3', '0.0', '1.67'],
        ['Others', '3', '100.0', '0.00'],
        ['Overall', '100', '66.0', '0.40'],
      ],
    },
    {
      name: 'NHTSA (completed cases)',
      rows: [['Overall', '48', '79.2', '0.27']],
    },
  ],
} as const;

/** Table 2 — Collision type consistency rate. */
export const tableCollisionType = {
  caption: 'Collision type consistency rate',
  note: 'The NHTSA cohort contains no single-vehicle cases in the current random sample.',
  columns: ['Collision type', 'MTCF (%)', 'NHTSA (%)'],
  rows: [
    ['Rear-end', '100.0', '100.0'],
    ['Head-on', '90.0', '75.0'],
    ['Angle', '100.0', '82.4'],
    ['Sideswipe', '100.0', '100.0'],
    ['Single vehicle incl. VRU', '100.0', '—'],
    ['Overall', '98.0', '85.4'],
  ],
} as const;

/** Table 3 — Injury severity consistency rate. */
export const tableInjurySeverity = {
  caption: 'Injury severity consistency rate',
  note: null,
  columns: ['Injury level', 'MTCF (%)', 'NHTSA (%)'],
  rows: [
    ['No injury', '84.6', '92.3'],
    ['Minor injury', '92.4', '84.6'],
    ['Serious injury', '66.7', '40.0'],
    ['Fatal injury', '0.0', '0.0'],
    ['Overall', '82.8', '77.1'],
  ],
} as const;

/** Table 4 — Generated vs. ground-truth trajectory fidelity. */
export const tableTrajectoryFidelity = {
  caption: 'Generated vs. ground-truth trajectory fidelity',
  note:
    'Evaluated on the two MTCF cases with roadside ground-truth trajectories: a roundabout and an intersection scenario.',
  columns: ['Metric', 'Case 1', 'Case 2'],
  rows: [
    ['d_F (m)', '2.84', '5.65'],
    ['DTW-ADE (m)', '0.62', '0.77'],
    ['HR@1m (%)', '68.33', '60.64'],
  ],
} as const;

/** Headline numbers for the hero strip. */
export const headline = [
  { value: '100%', label: 'Collision realization rate', context: 'MTCF, 100 cases' },
  { value: '98.0%', label: 'Collision-type consistency', context: 'MTCF, 100 cases' },
  { value: '85.4%', label: 'Collision-type consistency', context: 'NHTSA CISS, cross-database' },
] as const;

/** One scope sentence, stated once, in Results. */
export const benchmarkNote =
  'Values are reported in Tables 1\u20134 of the paper. The MTCF benchmark is a balanced cohort of 100 crash cases; cross-database generalization uses 50 randomly sampled NHTSA CISS cases, of which 48 complete every pre-rendering stage.';

export const bibtex = `@article{li2026crashfactory,
  title   = {CrashFactory: From Crash Databases to Scalable Safety-Critical Data
             Synthesis for End-to-End Autonomous Driving},
  author  = {Li, Haowei and Wang, Jiawei and Sun, Haowei and Yan, Xintao and Liu, Henry X.},
  year    = {2026},
  note    = {Preprint},
  url     = {https://ssrn.com/abstract=7288377}
}`;
