<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/bot.svg" width="80" alt="Claw Lite Logo" />
  <h1>Claw Lite</h1>
  <p><strong>Autonomous AI Agent for Automated Workflows & Inbox Processing</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js 15" />
    <img src="https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Groq-Llama%203.1-f55036?style=flat-square" alt="Groq AI" />
    <img src="https://img.shields.io/badge/Status-Beta-brightgreen?style=flat-square" alt="Status" />
  </p>
</div>

---

## 🎯 What is Claw Lite?

**Claw Lite** is a lightweight, autonomous AI agent that runs on a configurable heartbeat (e.g., every 15 minutes). It connects to your Gmail and Google Calendar to process your unread emails, extract actionable tasks, auto-draft replies, and summarize your digital activity. 

Designed for early-career developers and busy professionals, it features a Socratic, mentor-style Telegram bot interface. Instead of a clunky dashboard, your AI assistant lives right in your chat app, guiding you through tasks securely and efficiently.

### ✨ Key Features
*   **Autonomous Heartbeat:** Runs entirely in the background via Vercel Cron or GitHub Actions.
*   **Intelligent Email Processing:** Uses Groq (`llama-3.1-8b-instant`) to read emails, categorize them, and generate drafts.
*   **Actionable Task Extraction:** Automatically parses emails to create a definitive daily checklist.
*   **Telegram Command Center:** Interact seamlessly with your agent via a Telegram Webhook bot that uses RAG (Retrieval-Augmented Generation) on your database.
*   **Privacy-First:** Secure AES-256-GCM encryption for all OAuth tokens.

---

## 🛠 Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | Next.js 15 (App Router) | React framework mapped with Turbopack for rapid compilation. |
| **Language** | TypeScript | Strictly typed for robust enterprise-grade development. |
| **Database** | PostgreSQL + Drizzle ORM | Relational DB hosted on Railway or instantiated locally via PGLite. |
| **Authentication** | Clerk v7 | Effortless user management and secured routing. |
| **AI SDK** | Vercel AI SDK + Groq | Lightning-fast inference via the Llama 3.1 8B Instant model. |

---

## 🚀 Getting Started

### Prerequisites
Before you begin, ensure you have the following installed:
*   [Bun](https://bun.sh/) (v1.x)
*   A running PostgreSQL instance (or simply use the built-in local fallback)
*   Tokens from Clerk, Groq, Google Cloud Console, and Telegram BotFather

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/YourOrg/claw-lite.git
    cd claw-lite
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

3.  **Configure environment variables:**
    Copy the example template and fill in your keys.
    ```bash
    cp .template.env.local .env.local
    ```
    *Ensure you generate a secure 32-byte hex key for `TOKEN_ENCRYPTION_KEY`!*

4.  **Push the Drizzle Schema:**
    ```bash
    bunx drizzle-kit push
    ```

5.  **Run the development server:**
    ```bash
    bun run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 💻 Usage

### 1. Connect Your Integrations
Navigate to the **Settings** page in the Claw Lite dashboard.
*   Click **Connect** next to Gmail/Google Calendar to authenticate via OAuth. 
*   Paste your Telegram Bot token (from `@BotFather`) into the **Telegram Webhook Bot** section and click Connect. The webhook will map automatically.

### 2. Configure the Heartbeat
Set your agent interval (e.g., 15 minutes) inside the Settings tab. If hosted on a free tier like Vercel Hobby, you can ping `/api/agent/run` externally via GitHub Actions to bypass cron limits.

### 3. Chat with Your Agent
Open Telegram and message your newly configured bot.
*   **You:** *"Hey, what do I need to do today?"*
*   **Agent:** *"👋 Hello [Name]! I'm your Claw Lite mentor. Let's look at your queue. You had 3 new emails which I’ve summarized, resulting in 2 pending tasks..."*

---

## ⚙️ Configuration Options

| Environment Variable | Required | Description |
| :--- | :---: | :--- |
| `DATABASE_URL` | Yes | PostgreSQL connection string. |
| `GROQ_API_KEY` | Yes | API key from Groq console for Llama 3.1 inference. |
| `TOKEN_ENCRYPTION_KEY` | Yes | 64-character hex string for encrypting OAuth tokens. |
| `CRON_SECRET` | Yes | Bearer token used to authenticate heartbeat cron jobs. |
| `NEXT_PUBLIC_APP_URL` | Yes | Your production URL (necessary for Telegram Webhook routing). |

---

## ⚠️ Known Limitations

*   **Groq Rate Limits:** The `llama-3.1-8b-instant` model has strict Tokens-Per-Minute limits on the free tier. Processing dozens of unread emails simultaneously may trigger a `429 Too Many Requests` error. *(Pro-tip: Timegate heavy requests like daily digests).*
*   **Vercel Constraints:** Vercel Hobby tier only permits 1 Cron Job per day. To run the 15-minute heartbeat, utilize the provided `.github/workflows/agent-cron.yml`.

---

## 🤝 Support

Encountered an issue or want to contribute?
*   Open an [Issue](https://github.com/YourOrg/claw-lite/issues).
*   Review our architecture guides in `.agents/guide/`.
