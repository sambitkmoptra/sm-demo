# Campaign Orchestration Rules & Logic

This file outlines the routing logic and state management rules for the Campaign Orchestrator Agent.

## 1. Modular Workflow Evaluation
Upon receiving a Pub/Sub campaign initialization trigger, the Orchestrator must evaluate the campaign configuration object. The active steps are determined dynamically:
- **`run_copywriting` (Boolean)**: If true, route to the Copywriter Agent. If false, bypass copywriting entirely (or use user-provided static text).
- **`run_visuals` (Boolean)**: If true, route to the Visual Production Agent. If false, bypass image/video generation.
- **`run_safety_audit` (Boolean)**: If true, all generated assets (copy, visual prompts, metadata) must pass through the Brand Safety Auditor before final persistence.

## 2. Firestore Sync Rules
The Orchestrator must update Firestore synchronously at the following checkpoints:
- **`QUEUED`**: Event received from Pub/Sub.
- **`RESEARCH_ACTIVE`**: Copywriter is running Search Grounding desk.
- **`COPYWRITING_ACTIVE` / `VISUALS_ACTIVE`**: Writing or rendering assets.
- **`AUDIT_ACTIVE`**: Auditor validating output schemas.
- **`COMPLETED`**: Campaign assets verified and published to final schema.
- **`FAILED`**: Any agent exception, safety rejection, or workflow timeout.

## 3. Fallbacks and Error Handling
- If the Copywriter fails due to API quota limits or safety filters, the Orchestrator can fallback to a basic rule-based template filler or flag the state for manual approval.
- Visual generation timeouts must be retried automatically up to the limit configured in `config.json`.
