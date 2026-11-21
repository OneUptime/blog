# Test CyberArk DR Failover and Verify Passwords and Recordings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CyberArk, Disaster Recovery, Testing

Description: Design a controlled CyberArk DR exercise with replication gates, explicit CPM ownership, recording checks, and a failback that preserves changes made at DR.

A successful login to the disaster-recovery Vault is only the first result of a DR exercise. Password-management ownership must remain clear, recordings must be accounted for, and changes made at the recovery site must survive the return to the primary site.

This guide describes a test protocol for a PAM Self-Hosted Primary-DR environment using documentation labeled 15.2. It does not claim that a live failover was performed. Clustered and Distributed Vault deployments need their topology-specific procedures. A production exercise also needs an approved maintenance window, recovery owners, and an agreed point at which the test stops.

## Define what the exercise must prove

Choose measurable objectives before changing service state. Recovery time is the period until the required service is usable. Recovery point describes how much recent data the organization can tolerate losing. Neither is established by a service showing “Running.”

At minimum, define acceptance evidence for:

| Capability | Evidence |
|---|---|
| Vault availability | Authorized fresh login to the intended active Vault |
| Password access | Approved test account is accessible through the expected workflow |
| Password management | One designated CPM owns a controlled operation and its result is usable |
| Session access | A new PSM session reaches the intended test target |
| Recording preservation | Identified recordings remain playable after failover and failback |
| Return to normal | Primary is authoritative and DR replication is healthy again |

Use disposable test targets and accounts where a controlled rotation is necessary. Record the account identifier and operation outcome without recording its secret. If the exercise only validates password retrieval while rotation is paused, state that limitation explicitly.

## Treat failback as part of the exercise

The safe state transition is a sequence with one authoritative writer at a time:

```mermaid
flowchart LR
    A[Primary active and DR replicating] --> B[Quiesce writers and verify replication]
    B --> C[Controlled transfer to DR]
    C --> D[Validate access and approved operations]
    D --> E[Preserve DR changes and synchronize back]
    E --> F[Controlled return to primary]
    F --> G[Verify primary service and DR replication]
```

CyberArk's [DR exercise guide](https://community.cyberark.com/s/article/Running-a-Disaster-Recovery-Exercise-for-CyberArk-PAM-A-Comprehensive-Guide) emphasizes successful recent replication before the exercise and warns about split-brain tests. Split brain means two competing environments can act as if each owns the same accounts or targets.

A copied “test” environment that still reaches production targets is not safely isolated. For a laboratory rehearsal, use genuinely separate targets and identities. For a live exercise, follow the approved transfer procedure; do not leave a second active environment managing the same estate.

## Establish the replication baseline

Before the window, confirm the most recent successful replication in `PADR.log`, the relevant service states, available storage, component connectivity, and access to the recovery credentials and keys. Record which data is included and the actual replication schedule rather than assuming a default meets the recovery objective.

An authorized administrator can inspect selected configuration fields without printing the entire file. Replace the path with the installed `PADR.ini` location:

```powershell
$ErrorActionPreference = 'Stop'
Select-String -LiteralPath 'C:\REPLACE_PADR_PATH\PADR.ini' -Pattern @(
    '^\s*EnableFailover\s*=',
    '^\s*ActivateManualFailover\s*=',
    '^\s*EnableDBSync\s*=',
    '^\s*FailoverMode\s*='
)
```

The example uses Microsoft's [Select-String](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/select-string?view=powershell-7.5). It is a read-only inventory, not a health check. Missing fields or duplicate matches require interpretation against the installed release and approved runbook; do not infer defaults from silence.

The [predefined failover procedure](https://docs.cyberark.com/pam-self-hosted/latest/en/content/pasimp/initiating%20a%20predefined%20dr%20failover.htm) documents the relevant parameters, database synchronization, service transition, and additional cluster handling. Keep that complete procedure attached to the change. A few copied settings without the surrounding preparation are not a failover plan.

## Make CPM ownership an explicit decision

CPM changes passwords on external targets, so its behavior cannot be assessed solely by comparing Vault databases. If two CPM paths operate against divergent Vault states, the target can end up accepting a credential that one side no longer has.

The vendor's [component redirection guidance](https://knowledgebase.paloaltonetworks.com/KCSArticleDetail?id=kA1hj00000013TnCAI&lang=en_US) explicitly excludes CPM and PAReplicate from automatic multi-address DR switching. Its documented approach uses one Vault address and controlled redirection for those clients. Validate the corresponding procedure for your installed version.

Pause ordinary password work according to the maintenance plan and resolve in-flight operations before transferring ownership. Identify which CPM, if any, will run during the DR phase. Keep other writers stopped or otherwise fenced from the same targets through the approved design.

After DR is authoritative, allow only the planned test operation first. Verify it completed, confirm the target accepts the resulting credential through an approved workflow, and inspect the associated audit evidence. Resume broader password work only if the exercise scope permits it and the recovery owner has accepted the result. Record every change that must be preserved during failback.

## Account for recordings in three states

Do not promise zero recording loss from failover alone. CyberArk's [PSM DR documentation](https://docs.cyberark.com/pam-self-hosted/latest/en/content/pas%20inst/optional-psm-in-a-vault-disaster-recovery-site.htm) distinguishes uploaded recordings from those still awaiting upload and warns that active-session recordings can be corrupted or lost.

Design separate checks:

1. **Completed before failover:** close a designated test session, confirm its recording uploaded, and verify it is included in successful replication.
2. **Created while DR is active:** launch a new session, perform a harmless identifiable action, close it, and verify recording availability at DR.
3. **Active at the transition:** test this separately only when the risk is explicitly accepted, preferably in the rehearsal environment. A missing or damaged recording is a result to report, not a reason to silently omit the case.

For a planned production exercise, drain active sessions where the recording-preservation objective requires it. Record session identifiers, target names, times, upload status, and playback results. A search result showing a recording entry is weaker evidence than opening the recording and confirming the expected session content.

Do not delete local recording material to make storage or upload warnings disappear. Have the recording owner account for pending uploads before declaring the transition complete.

## Transfer back without discarding the DR interval

While DR is active, new audit events, recordings, component credentials, and possibly managed-password changes can accumulate there. Returning clients to an older primary copy can discard or contradict that interval.

The official [DR failback procedure](https://docs.cyberark.com/pam-self-hosted/latest/en/content/pasimp/initiating-dr-failback-to-production-vault.htm) brings the primary site back in DR mode, verifies replication from the active recovery site, and then performs the controlled role transition. Follow the steps applicable to the actual topology; cluster-specific management operations do not belong in a generic standalone script.

Before the final transfer, quiesce writers and account for final changes under the approved procedure. Verify successful synchronization and the required evidence from the DR interval. Do not treat “the primary server is reachable again” as permission to reconnect all consumers.

After returning to primary, repeat the test-account check and open both the pre-failover and DR-created recordings. Confirm component authentication and that the recovery Vault has returned to replication mode. Use current logs to establish successful replication, not merely the intended settings in a configuration file.

## Report gaps as test results

The report should list measured timings, the last confirmed replication point, controlled password operations, recording identifiers and playback outcomes, and any manual intervention. Separate capabilities demonstrated from capabilities deferred.

If a credential mismatch, incomplete replication, or missing recording remains unexplained, keep the exercise open and preserve the evidence. A useful DR test ends with an understood recovery state and an actionable list of improvements, rather than a green checkbox based on one successful login.
