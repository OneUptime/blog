# AI Is Writing Your Code. Who's Watching It Run?

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, DevOps, AI, Incident Management, SRE

Description: AI coding agents ship code faster than humans can review it. Your observability stack is now the last line of defense.

Claude Code just hit #1 on Hacker News. Cursor is everywhere. Copilot ships to every VS Code install. AI coding agents aren't a novelty anymore - they're writing production code at companies of every size.

Here's what nobody's talking about: the faster you ship, the faster you break things. And AI agents ship *fast*.

## The Speed Problem

A senior engineer might push 2-3 PRs a day. A team of 10 might merge 15-20 changes daily. An AI coding agent can generate dozens of PRs in an afternoon - and it doesn't get tired, doesn't second-guess itself, and doesn't slow down on Fridays.

That's the value proposition, and it's real. But there's a catch.

Every merged PR is a potential incident. Every deployed change is a roll of the dice. When humans wrote all the code, the pace of change was naturally throttled by human speed. AI removed that throttle.

The question isn't whether AI-generated code will cause production incidents. It already has. The question is whether your monitoring catches it before your users do.

## What Changes When AI Writes Code

### Deploy velocity outpaces review capacity

Code review has always been a bottleneck. With AI agents, the bottleneck gets worse - there's more code to review, and it arrives faster. Teams that can't keep up start rubber-stamping approvals. Some skip review entirely for "AI-generated refactors."

This means more untested assumptions reaching production. More edge cases nobody thought about because nobody *read* the code closely enough.

### The blast radius is unpredictable

Human engineers develop intuition about what's risky. They know which files are landmines, which services are fragile, which database queries will blow up under load. AI agents don't have that context - or they have it abstractly without the gut feeling that makes experienced engineers cautious.

An AI agent will cheerfully refactor your billing service and your authentication layer in the same afternoon. A human would have spread that risk across two sprint cycles.

### Debugging gets harder

When a human writes code, they can explain their reasoning during an incident. "I changed the retry logic because we were hitting rate limits" - now you know where to look.

When AI writes code, the reasoning is... a prompt. Maybe a conversation thread. The person who approved the PR might not fully understand every change. During a 3 AM incident, that knowledge gap costs you time. And time during an incident is measured in revenue.

## Your Observability Stack Is the Last Line of Defense

Here's the uncomfortable truth: if AI is writing your code, your monitoring, alerting, and incident management systems aren't just useful - they're critical infrastructure. They're the safety net that catches what code review missed.

This changes your priorities:

### 1. Real-time alerting becomes non-negotiable

If deploy velocity is 5x higher, you need to detect regressions 5x faster. Delayed alerts that were "good enough" when you deployed twice a week are dangerous when you deploy twenty times a day.

You need alerts that fire within minutes of a deploy, not hours. Latency spikes, error rate increases, resource usage anomalies - these need to surface immediately and reach the right person.

### 2. Status pages become essential communication infrastructure

When AI-accelerated deployments cause issues, your users find out fast - probably faster than you do. A well-maintained status page isn't just nice to have. It's the difference between customers seeing "we're aware and working on it" versus flooding your support inbox while you're still figuring out what happened.

### 3. Incident management needs structure, not heroics

More deploys means more incidents. More incidents means you need a repeatable process - triage, communication, resolution, postmortem. You can't rely on the one engineer who knows everything. (Especially when AI wrote the code they're debugging.)

On-call rotation, escalation policies, automated incident creation from alerts - this infrastructure matters more when the pace of change is relentless.

### 4. Logs and traces become your investigation toolkit

When you're debugging AI-generated code you didn't write and maybe didn't fully review, logs and distributed traces aren't optional. They're how you reconstruct what happened. Without them, you're reading unfamiliar code at 3 AM with nothing but stack traces and prayers.

### 5. Correlation is everything

The killer question during any incident: "what changed?" When AI is shipping multiple changes across services, you need to correlate deploys with metrics. Did latency spike after that AI-generated PR to the payment service? Or was it the database migration that merged two minutes later?

Without deploy tracking tied to your observability data, you're guessing. And guessing costs money.

## The Irony of AI-Driven Development

There's a paradox in the AI coding wave: the technology that makes development faster makes operations more critical. Teams investing in AI coding tools while neglecting observability are building on sand.

The companies that will thrive in the AI coding era aren't the ones shipping the most code. They're the ones who can ship fast *and* detect, respond to, and recover from problems quickly.

That means:

- **Monitoring** that catches regressions in real time
- **Alerting** that reaches the right person immediately
- **Status pages** that keep users informed
- **Incident management** that turns chaos into process
- **On-call** that distributes load across the team
- **Logs and APM** that make debugging possible when you didn't write the code
- **Error tracking** that surfaces new exceptions before they become outages

This isn't a shopping list. It's the minimum viable safety net for teams using AI to write production code.

## What To Do About It

If your team is adopting AI coding tools (and at this point, who isn't?), here's a practical checklist:

**Immediate:**
- Audit your alert latency. How fast do you know about problems after a deploy? If it's more than 5 minutes, fix that first.
- Set up deploy tracking tied to your monitoring. Every deploy should be a marker on your dashboards.
- Review your on-call setup. More deploys means more potential pages. Make sure the rotation is sustainable.

**This quarter:**
- Implement automated canary analysis or progressive rollouts. Let your monitoring gate your deploys.
- Set up a public status page if you don't have one. Your users deserve to know what's happening.
- Build a real incident management process - not "whoever's awake" but a defined workflow with roles and communication channels.

**Ongoing:**
- Treat observability investment proportionally to development velocity. If AI doubles your deploy rate, your monitoring needs to keep pace.
- Run postmortems on AI-generated incidents specifically. Track whether AI-authored code has different failure patterns.
- Share observability context with your AI tools. The better your agents understand your infrastructure, the less likely they are to generate code that breaks it.

## The Bottom Line

AI coding agents are genuinely revolutionary. They're making individual developers more productive than ever. But productivity without reliability is just faster failure.

The teams that get this right - shipping fast with AI *and* catching problems instantly - will outcompete everyone else. The teams that only optimize for shipping speed will learn the hard way that speed without visibility is a liability.

Your AI agent doesn't lose sleep over production incidents. Someone on your team does. Give them the tools to sleep soundly.
