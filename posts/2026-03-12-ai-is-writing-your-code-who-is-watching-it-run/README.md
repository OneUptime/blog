# AI Is Writing Your Code. Who Is Watching It Run?

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: AI Coding Agents, Observability, Incident Management, DevOps, Open Source, AI Ops, Monitoring, SRE

Description: Amazon's AI coding tools caused a 13-hour outage. As AI writes more production code, observability is no longer optional - it is the last line of defense.

Last week, Amazon's AI coding tool decided to "delete and recreate" a production environment. The result: a 13-hour outage. Amazon's response? Require senior engineers to sign off on all AI-assisted changes going forward.

That policy will help. But it misses the bigger problem.

## The Real Issue Is Not Code Review

The instinct to add more human review is understandable. But think about what happened: an AI tool made a change that looked reasonable in a pull request, and it destroyed a running system. The AI didn't write bad code in the traditional sense. It wrote code that *worked* - it just happened to tear down the thing it was supposed to update.

Code review catches logic errors, bad patterns, and security issues. It does not reliably catch "this migration will nuke your environment." That is a runtime problem, and it needs a runtime solution.

Senior engineer sign-off is a gate. Observability is a net.

You need both.

## AI Code Changes Faster Than Humans Can Review

Here is the math that should worry every engineering leader: AI coding tools are accelerating the *volume* of changes hitting production. GitHub reported that Copilot users accept roughly 30% of suggestions. Cursor, Windsurf, Claude Code, and Kiro are pushing that number higher - entire features, not just autocomplete.

Meanwhile, most teams have *fewer* senior engineers than they did two years ago. Amazon itself cut 16,000 corporate roles in January. The review bottleneck is real and getting worse.

So what happens when the volume of AI-generated changes outpaces the capacity to review them? The same thing that happens when any system gets overloaded: stuff gets missed, shortcuts get taken, and incidents spike.

Amazon's own engineers told the Financial Times that their teams are dealing with a higher number of "Sev2s" - incidents requiring rapid response - every day. That is not a coincidence.

## The Observability Gap

Traditional monitoring was built for a world where humans wrote code, reviewed it carefully, deployed it slowly, and understood what was running. That world is gone.

AI-generated code introduces a new class of risk:

- **Unexpected side effects.** AI tools optimize for the stated goal. They do not always understand the blast radius. An AI might refactor a database migration in a way that is syntactically correct but operationally catastrophic.
- **Subtle behavioral changes.** An AI-assisted refactor might change error handling, retry logic, or timeout behavior in ways that are invisible in code review but obvious in metrics.
- **Higher change velocity.** More changes per day means more potential failure points. Your mean time between failures drops unless your detection keeps pace.
- **Knowledge gaps.** When AI writes the code, the human deploying it may not fully understand what it does. That makes debugging slower and incidents longer.

This is not a hypothetical. It is happening at Amazon, one of the most sophisticated engineering organizations on the planet. If it is happening there, it is happening at your company too.

## What Actually Helps

Adding a sign-off gate is fine. But the real answer is building systems that catch problems *after* code ships, because some problems are only visible at runtime.

Here is what that looks like in practice:

### 1. Monitor Everything, Not Just What You Expect to Break

AI-generated code breaks in unexpected places. You cannot predict which metric will spike or which endpoint will degrade. You need broad coverage: APM traces, error rates, latency percentiles, log anomalies, and infrastructure metrics - all in one place.

If your monitoring only covers the "known" failure modes, AI-generated failures will slip through every time.

### 2. Automate Incident Detection

When changes ship 3x faster, you cannot rely on humans staring at dashboards. Automated alerting with sensible thresholds and anomaly detection is table stakes. The alert should fire *before* a customer notices, not after.

### 3. Correlate Deployments with Incidents

The single most useful thing you can do is connect "what changed" with "what broke." When you can see that a deployment at 2:47 PM correlates with a latency spike at 2:52 PM, you have cut your mean time to resolution in half.

### 4. Status Pages as Accountability

When AI-assisted changes cause customer-facing issues, transparent communication matters. A status page that updates automatically from your incident management system keeps customers informed and keeps your team honest about the impact.

### 5. On-Call That Does Not Burn People Out

Higher change velocity means more incidents. More incidents mean more on-call load. If your on-call tooling is fragmented across three different platforms, your engineers will burn out faster. Consolidate.

## The Open Source Advantage

Here is the thing about this new world of AI-generated code: you need to *trust* your observability platform more than ever. When AI is writing code you do not fully understand, you do not want your monitoring to also be a black box.

Open source observability gives you the ability to inspect, audit, and extend your monitoring stack. You can verify that it is actually catching what it claims to catch. You can run it on your own infrastructure, so your observability data does not leave your network.

This matters more when the code running in production was written by something other than your team.

## The Bottom Line

Amazon's new policy - senior sign-off on AI changes - is a reasonable first step. But it is a human solution to a problem that is scaling beyond human capacity.

The teams that navigate this transition well will be the ones that invest in observability *before* their AI coding tools cause a 13-hour outage. They will have:

- Full-stack monitoring that catches unexpected failures
- Automated incident detection and response
- Deployment-to-incident correlation
- Transparent status communication
- Consolidated on-call management

The AI coding revolution is here. The question is not whether to adopt it - it is whether your safety net is ready for what it produces.

Your code review process is the seatbelt. Your observability platform is the airbag. You need both, and right now, most teams are driving without the airbag.
