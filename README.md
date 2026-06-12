# Enterprise Multi-Agent Social Media Automation SaaS
## Workspace 2: Multi-Agent Engine (Backend Platform)

Welcome to the backend architecture repository for the Enterprise Social Media Automation SaaS. This workspace contains the code, configurations, rules, and deployment pipelines for the Multi-Agent Engine, powered by Google Cloud Platform (GCP) native services and Vertex AI.

---

## 🏗 High-Level Architecture & Communication Flow

```mermaid
graph TD
    %% Client & State Layer
    UI[Next.js App / Firebase Hosting] <-->|Real-Time Sync| Firestore[(Cloud Firestore State)]

    %% Orchestration
    GW[Google Workflows] <-->|Reads/Writes State| Firestore
    PubSub[Cloud Pub/Sub] -->|Shock Absorption & Event Trigger| GW

    %% Multi-Agent Engine
    subgraph Agent Engine (Vertex AI Agent Platform)
        Orch[Orchestrator Agent]
        Copywriter[Copywriter Agent]
        Visual[Visual Production Agent]
        Auditor[Brand Safety Auditor]
    end

    %% Agent Interactions
    GW <-->|Invokes Agent / Evaluates Outputs| Orch
    Orch -->|Delegates Task| Copywriter
    Orch -->|Delegates Task| Visual
    Copywriter -->|Generate Copy / Blog / Post| Grounding[Google Search Grounding Desk]
    Visual -->|Generate Cinematic Video & Audio| Veo[Veo 3.1 & Imagen]
    
    %% Compliance Loop
    Copywriter -->|Draft Copy| Auditor
    Visual -->|Draft Media Metadata| Auditor
    Auditor -->|Strict JSON Schema validation| Decision{Approved?}
    Decision -->|Yes| Firestore
    Decision -->|No / Flagged| Orch
```

### 1. Orchestration & Asynchronous Flow
* **Cloud Pub/Sub**: Incoming campaign requests are published to Pub/Sub topics. This decouples user action from resource-heavy processing (video render, research generation) and protects against traffic spikes.
* **Google Workflows**: A serverless, stateful orchestrator that manages the step-by-step execution. It calls the agent endpoints, handles failures, maintains sequence, and polls progress.
* **Cloud Firestore**: Acts as the single source of truth (SSOT) and progress mirror. Every major step and state transition is written to Firestore, enabling the Next.js frontend to update in real time.

### 2. Multi-Agent Components
* **Orchestrator Agent**: Decides which sub-agents to trigger based on the user's campaign configuration. It parses user-selected toggles (modular mode) and directs work.
* **Copywriter Agent**: Responsible for drafting campaign blogs, text posts, captions, and scripts. Utilizes **Gemini 3** models and is natively integrated with **Google Search Grounding** to prevent hallucinations.
* **Visual Production Agent**: Interacts with the **Veo 3.1** and **Imagen** APIs. Generates 4K video assets and synchronized native voiceovers/audio tracks, maps brand assets (e.g. logos, products) onto visual personas, and registers assets in GCP Storage.
* **Brand Safety Auditor Agent**: A deterministic, schema-bound guardrail. It checks copywriting and asset metadata against strict brand safety rules (JSON schemas), flagging compliance issues before anything is committed to Firestore or external APIs.

---

## 📁 Directory Structure Blueprint

We scaffold the repository with a modular, clear separation of agent configurations, backend services, orchestration flows, and tests:

```
.
├── .agents/                        # Agent Specifications & Metadata (No Code)
│   ├── orchestrator/
│   │   ├── config.json             # Orchestrator system parameters
│   │   └── rules.md                # Orchestration policies and routing logic
│   ├── copywriter/
│   │   ├── config.json             # Copywriter temperature, grounding controls
│   │   └── safety_rules.md         # Writing guidelines & voice alignment rules
│   ├── visual_production/
│   │   ├── config.json             # Veo / Imagen configuration params
│   │   └── style_guide.md          # Visual asset parameters and standards
│   └── safety_auditor/
│       ├── config.json             # Auditor configurations & threshold setups
│       └── safety_schema.json      # JSON Schema for compliance validation
│
├── agents/                         # Agent Implementation Code (Python / TypeScript)
│   ├── orchestrator/
│   │   ├── __init__.py
│   │   ├── coordinator.py          # State/agent router
│   │   └── pubsub_handler.py       # Pub/Sub listeners & publishers
│   ├── copywriter/
│   │   ├── __init__.py
│   │   ├── agent.py                # Gemini API call with Search Grounding
│   │   └── prompts.py              # System prompts & template helpers
│   ├── visual_production/
│   │   ├── __init__.py
│   │   ├── generator.py            # Veo & Imagen integration logic
│   │   └── asset_mapper.py         # Visual asset mapping utilities
│   ├── safety_auditor/
│   │   ├── __init__.py
│   │   ├── validator.py            # Compliance audit logic (strict JSON verification)
│   │   └── rules_engine.py         # Custom rule evaluator
│   └── shared/                     # Shared utilities & clients
│       ├── __init__.py
│       ├── firestore.py            # Firestore state management wrapper
│       └── gcp_clients.py          # Vertex AI, Pub/Sub, Storage clients
│
├── workflows/                      # Google Workflows Definition (YAML)
│   ├── campaign_workflow.yaml      # Main workflow file linking sub-agents
│   └── sub_workflow_helpers.yaml   # Helper workflows (retry logic, error handlers)
│
├── tests/                          # Automated Tests
│   ├── unit/                       # Unit tests for individual agent modules
│   └── integration/                # Integration tests (mocked GCP services)
│
├── scripts/                        # Utility & Deployment Scripts
│   ├── deploy_workflows.sh         # Script to push YAML to Google Workflows
│   └── local_emulator.sh           # Local Firestore and Pub/Sub emulator script
│
├── README.md                       # This file
├── requirements.txt                # Python dependencies
└── pyproject.toml                  # Python package configuration
```

---

## 🛠 Next Steps
1. **Define Agent Schemas and Prompts**: Populate the configurations and schemas in the `.agents/` folder.
2. **Setup Local Mock Services**: Standardize test suites with Firestore / Pub/Sub emulators.
3. **Build the Safety Auditor**: Establish the JSON schema and validation pipeline.
4. **Develop Agent Logic**: Implement Python interfaces using the Vertex AI ADK.
