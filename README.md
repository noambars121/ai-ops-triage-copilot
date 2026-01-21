# Support Triage Copilot (Enterprise Edition)

An AI-powered support operations platform designed for high-volume ticket triage, automated drafting, and operational efficiency.

## 🚀 What It Does

*   **Intelligent Triage**: Auto-categorizes tickets, detects urgency, and drafts replies using **Gemini 2.0 Flash**.
*   **RAG-Enhanced**: Retrieves relevant Knowledge Base articles to ground AI responses (citations included).
*   **Operational Hygiene**: Smart deduplication (fuzzy matching), secure file handling, and audit logging.
*   **Impact Analytics**: Real-time dashboard measuring time saved, triage latency, and escalation rates.
*   **Enterprise Ready**: Secure admin sessions, role-based route protection, and resilient retry pipelines.

## 🏗️ Architecture

1.  **Ingest**: Customer submits ticket via `/new` (Secure Uploads -> `private/uploads`).
2.  **Process**:
    *   **Dedupe**: Checks for duplicate/spam (Exact + Fuzzy Jaccard).
    *   **RAG**: Searches SQLite KB for context.
    *   **LLM**: Gemini analyzes sentiment, urgency, and drafts reply with citations.
3.  **Review**: Agent reviews in `/inbox`.
    *   **Approve**: Sends email (Simulated with delay/failure toggle).
    *   **Edit/Escalate**: Human-in-the-loop overrides.
4.  **Monitor**: `/metrics` for ROI and `/logs` for system health.

## 🛠️ How to Run

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Configure Environment**:
    Create `.env`:
    ```env
    # Required
    DATABASE_URL="file:./dev.db"
    ADMIN_PASSWORD="admin"
    JWT_SECRET="your-secret-key-min-32-chars"
    
    # AI Provider (at least one required, or use mock mode)
    GEMINI_API_KEY="your-gemini-key"
    # OPENAI_API_KEY="" # Fallback if GEMINI_API_KEY not set
    
    # Optional - Testing
    # SIMULATE_EMAIL_FAILURE="true" # Test email failure handling
    # WEBHOOK_URL="" # Outbound webhook for ticket events
    ```

3.  **Initialize Database**:
    ```bash
    npx prisma db push
    npx tsx prisma/seed.ts
    ```

4.  **Start Server**:
    ```bash
    npm run dev
    ```
    Visit `http://localhost:3000`.

## 🧪 Demo Mode & Testing

*   **Mock Mode**: If no API key is provided, the system falls back to a deterministic mock LLM.
*   **Failure Simulation**:
    *   Set `SIMULATE_EMAIL_FAILURE="true"` in `.env` to test the "Retry" flow in the UI.
    *   Upload a file > 10MB to test client-side validation.
    *   Visit `/logs?status=failed` to see error traces.

## 📊 Key Metrics (`/metrics`)

*   **Automated Triage Count**: Volume of AI-processed tickets.
*   **Median Latency**: System performance tracking.
*   **Time Saved**: ROI estimation based on 4-minute manual triage benchmark.
*   **Approval Rate**: Percentage of tickets approved without escalation.
*   **Escalation Rate**: Percentage requiring human intervention.

## 🔗 System Integrations

*   **Outbound Webhooks**: Triggers on ticket events (approve/escalate) with retry logic.
*   **Secure File API**: Auth-protected file serving with path traversal protection.
*   **Health Check Endpoint**: `/api/health` for monitoring integrations.