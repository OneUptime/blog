# How to Write PCI DSS Targeted Risk Analyses for Flexible Control Frequencies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PCI DSS, Risk Management, Compliance

Description: Write a PCI DSS targeted risk analysis that connects a permitted control frequency to assets, threats, operating evidence, and review triggers.

---

A targeted risk analysis (TRA) should explain why a specific control frequency is appropriate for a specific environment. “Low risk, review annually” is not an analysis. It omits the assets, threat scenario, exposure window, and evidence that connect the schedule to the risk.

PCI DSS v4.0.1 Requirement 12.3.1 specifies the contents of these analyses where another requirement calls for one. Requirement 12.3.2 covers a different TRA used for the customized approach. Keep those two records distinct. [PCI DSS v4.0.1, 12.3.1 and 12.3.2](https://www.pcisecuritystandards.org/document_library/)

## Confirm that the requirement permits a TRA

Build a register of requirements that explicitly refer to 12.3.1. Examples include the review frequency for other system-component logs under 10.4.2.1, treatment of lower-ranked internal-scan vulnerabilities under 11.3.1.1, and incident-response training frequency under 12.10.4.1. Payment-page tamper detection under 11.6.1 permits at least weekly operation or a TRA-defined frequency.

Do not use that register to relax unrelated fixed requirements. A TRA under 12.3.1 does not turn quarterly ASV scanning into annual scanning or replace mandatory daily reviews under 10.4.1. The PCI SSC guidance distinguishes frequency-setting TRAs from customized-approach analyses. [PCI SSC TRA guidance overview](https://blog.pcisecuritystandards.org/just-published-pci-dss-v4-x-targeted-risk-analysis-guidance)

Record the requirement number, the exact decision it permits, and the systems to which the decision applies. Avoid a single frequency covering unrelated services merely because they share an owner.

## Describe assets and a concrete threat

For incident-response training, the assets include payment services, responder access, evidence repositories, and the team's ability to contain an exposure. A useful threat scenario is that a newly assigned responder mishandles an unexpected-PAN alert because they do not know the containment procedure.

Identify the factors affecting likelihood or impact: staff turnover, incident complexity, role changes, provider dependencies, exercise results, availability of a current runbook, and the volume of payment operations affected by delayed response. Link those factors to observed records where possible.

Write assumptions explicitly. If the analysis relies on every new responder completing onboarding before joining the rota, verify that gate exists. An assumed control that is not operating cannot justify a longer interval.

## Compare candidate schedules

Choose the frequency by reasoning about the exposure window. For the training example, compare quarterly exercises, six-month refresher training, and annual training against turnover and observed response errors. Explain which threats more frequent training addresses and which require a different control.

A compact decision record might look like this:

```text
Requirement: 12.10.4.1
Population: payment incident responders and incident commanders
Decision: refresher exercise every six months
Additional triggers: new role, major playbook change, failed exercise
Evidence: rota changes, exercise results, incident retrospective actions
Reason: major response procedures change several times per year;
        onboarding alone does not refresh existing responders
Review: no later than twelve months from approval
```

The interval is illustrative. It is not a PCI-approved default. Explain why your selected schedule, together with the stated processes, minimizes the relevant likelihood or impact. For technical controls, include detection delay, response capacity, deployment rate, and failure history rather than borrowing the training example's rationale.

## Make the record complete and reviewable

Include assets, threats, likelihood and impact factors, the resulting analysis, chosen frequency or process, and its justification. Assign an owner and record the review date. Requirement 12.3.1 calls for reviewing each TRA at least every 12 months and updating it when needed based on that review. [PCI DSS v4.0.1, 12.3.1](https://www.pcisecuritystandards.org/document_library/)

Add practical early-review triggers such as a new attack technique, a change in data volume, a material architecture change, or a failed exercise. These make the document useful between scheduled reviews. A signed annual review that ignores a changed environment is weak evidence of an appropriate decision.

A numeric likelihood-impact score can help compare decisions, but define the scales and evidence behind them. Multiplying two subjective numbers does not establish that a six-month interval is sufficient.

## Connect the decision to execution

Configure the scheduler, work queue, or training calendar from the approved decision. Retain completed activities and missed-run escalations. Review both the document and the actual records: a well-written TRA does not prove the resulting control operated.

For lower-ranked vulnerabilities, make the allowed treatment and deadlines traceable to the TRA. Do not use this flexibility for unresolved high-risk or critical findings, which have separate requirements. [PCI SSC FAQ 1597](https://www.pcisecuritystandards.org/faqs/1597/)

A reviewer should be able to follow the chain from threat to schedule to completed activity, then understand what would cause the schedule to change. That is the difference between a risk decision and a calendar preference.
