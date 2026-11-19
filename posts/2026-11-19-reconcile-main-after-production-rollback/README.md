# Production Is Rolled Back but `main` Is Still Broken: How to Reconcile Git and the Running Release

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Git, GitOps, Rollback, Deployment, Incident Response

Description: Repair application main after a production rollback, preserve later changes, reconcile release manifests, and carry emergency fixes into the next normal build.

Production is serving the previous release and checkout works again. Meanwhile, the application repository still contains the faulty checkout change. The next routine build can bring the incident back, even if the deployment manifest correctly points at the older image.

Recovery therefore needs two follow-ups: make the running release durable in deployment configuration, and make the application source safe to build again.

## Record Three Different Identities

Consider a small release history:

- Source commit **A** produced the working artifact.
- Source commit **B** introduced the checkout regression and was deployed.
- Unrelated change **C** subsequently landed on application `main`.
- The operator restored the artifact built from **A**.

Capture the following in the incident record before editing anything:

| Layer | State after emergency rollback | Required decision |
| --- | --- | --- |
| Application source | `main` is at C and still includes B | Revert B or fix its behavior |
| Deployment configuration | May still request the artifact from B | Declare the intended production artifact |
| Running release | Serving the artifact from A | Verify identity and customer recovery |

Use build records to connect source SHAs to artifacts. Record the image digest, configuration revision and any migrations alongside the source commit. A rebuild of A is a new build, so reuse the already verified artifact when keeping production on A. Container tags can move; digests identify fixed content. [Kubernetes image documentation](https://kubernetes.io/docs/concepts/containers/images/)

## Hold Promotion While Repairing Source

Pause this application's automatic production promotion through the existing incident control. Check queued deployments and image-update automation as well as currently running jobs. A new source commit must not automatically replace the recovered release before validation.

For a GitOps-managed deployment, commit the production image reference and compatible configuration to the repository and path the controller actually tracks. That may be a different repository from application `main`.

Argo CD self-healing can reverse a live-only edit. Disabling self-heal alone is insufficient protection against other sync triggers; ApplicationSet-managed applications also need their controlling configuration considered. Argo CD's application-history rollback is unavailable while automated sync is enabled. Use the documented controls for your application, and give any temporary suspension an owner and an explicit restoration condition. [Argo CD automated sync policy](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/)

## Repair Current `main`, Preserving Later Work

In the example, create a repair branch from current `origin/main`, then reverse B. Do not replace the whole source tree with A: that would also remove C.

Start with a clean application checkout. The example assumes B is an ordinary single-parent commit, including a squash commit. Replace the placeholder with the source SHA identified in the incident, not a deployment-repository SHA.

```bash
bad_commit=REPLACE_WITH_FULL_SOURCE_COMMIT_SHA

git status --short
# Continue only when the checkout is clean.
git fetch origin
git switch -c incident/checkout-repair origin/main
git show --stat "$bad_commit"
git revert --no-edit "$bad_commit"
git diff origin/main...HEAD
```

`git revert` records an inverse change in a new commit. It does not move shared `main` backward. Later work can cause conflicts: resolve deliberately, stage the resolved paths, then use `git revert --continue`; use `git revert --abort` to cancel the attempt. A successful revert still needs semantic testing. [Git revert reference](https://git-scm.com/docs/git-revert)

Add a regression test that reproduces the failed checkout on B and passes on the repair. Verify C still works. If C depends on B, decide whether to revert that dependent work too or implement a forward fix; a clean textual patch does not establish compatibility.

Open a pull request targeting `main`, link the incident and failed source commit, and run the repository's required checks. GitHub branch protection can require reviews and status checks for merges; retain the team's configured controls. [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)

## Treat Merge Reverts as a Separate Case

If the faulty unit is a merge commit, inspect its parents first:

```bash
git show --no-patch --pretty=raw "$bad_commit"
# Alternative to the ordinary revert above:
# Use 1 only after confirming parent 1 is the intended mainline.
git revert --no-edit -m 1 "$bad_commit"
```

The selected parent defines the baseline whose changes are retained; it is not a branch name. Review whether reversing the entire merge removes unrelated fixes. [Git revert mainline semantics](https://git-scm.com/docs/git-revert)

Also plan reintroduction. Reverting a merge leaves its ancestry intact, so merging the same feature branch again does not automatically restore the reverted changes. If developers add fixes on top of that branch, a reviewed revert-of-the-revert plus those fixes may be appropriate. If they rebuild the corrected feature from current `main`, blindly reverting the revert can duplicate changes. Test the complete candidate before promotion; never deploy the temporarily restored broken code. [Git's faulty-merge recovery guide](https://github.com/git/git/blob/HEAD/Documentation/howto/revert-a-faulty-merge.adoc)

## Bring Emergency Source Fixes Back

Sometimes production runs a release-branch hotfix instead of unchanged A. That fix must also reach the normal application branch. On a fresh branch from current `origin/main`, review and apply the individual fix:

```bash
release_fix=REPLACE_WITH_FULL_HOTFIX_COMMIT_SHA

git fetch origin
git switch -c incident/forward-port-checkout origin/main
git show "$release_fix"
git cherry-pick -x "$release_fix"
```

This assumes the fetched commit is available locally. Cherry-pick applies its changes and normally creates a new commit. The `-x` option records origin provenance for a conflict-free pick; preserve that reference manually if conflict resolution omits it. [Git cherry-pick reference](https://git-scm.com/docs/git-cherry-pick)

Review dependencies and rerun the reproducer against current `main`. If the release fix targets code removed by the earlier revert, adapt the fix or rebuild the corrected feature instead of blindly replaying it. Merge the reviewed forward-port before declaring the source repair complete.

## Reopen the Normal Release Path Deliberately

Build and validate the merged source through normal CI. Associate its exact SHA with the resulting artifact digest, and retain the checkout regression test in required validation. Check compatibility with the database and configuration currently in production before promotion.

Production may intentionally remain on A while repaired `main` awaits release. Reconciliation means that this relationship is recorded and controlled; the two SHAs need not be identical.

Before restoring automatic promotion, confirm that deployment configuration names the approved artifact, the serving release matches that decision, source `main` contains the repair, and queued jobs cannot redeploy the failed artifact. When the repaired build is promoted, verify the actual customer checkout again. That closes the gap between recovering today's traffic and keeping tomorrow's deployment safe.
