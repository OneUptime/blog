# Build Change-Aware Drone Monorepo Pipelines to Run Only Affected Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, Monorepo, CI/CD, Git, Python

Description: Select affected services in Drone monorepos with a conservative Git change detector, explicit fallback behavior, and dependency-aware testing.

Running every service for every documentation change wastes CI time. Skipping a service because a change detector misunderstood a merge or a shared library is worse: the build looks healthy without testing the code that matters.

Start with a conservative affected-service calculation. Optimize only the cases for which the detector has reliable inputs, and run the full suite when it cannot establish the change boundary.

## Choose where the decision happens

Drone's standard Docker pipeline conditions include events, branches, refs, repositories, status, and deployment targets. The documented [pipeline schema](https://docs.drone.io/yaml/docker/) does not define a general `paths` condition. Do not copy a path-filter field from another CI product and assume Drone will enforce it.

A detector inside a step can skip expensive commands, but Drone still schedules that step and its container. If your objective is to avoid scheduling entire pipelines, compute the affected set before execution through a reviewed [configuration extension](https://docs.drone.io/extensions/configuration/) or another supported configuration-generation mechanism.

Keep selection logic protected from untrusted changes if it determines required release checks. Otherwise a pull request can simply edit the detector to say no tests are necessary.

## Use a conservative push baseline

For ordinary push events, Drone supplies before and after commit metadata. The [before-commit reference](https://docs.drone.io/pipeline/environment/reference/drone-commit-before/) and [after-commit reference](https://docs.drone.io/pipeline/environment/reference/drone-commit-after/) define these values. Check that both objects exist locally before using them.

Save this example as `ci/affected_services.py`. It handles pushes whose Git objects are available and runs all services for other events or uncertain history:

```python
import os
from pathlib import Path
import re
import subprocess

services = {'api', 'worker', 'web'}

def affected():
    if os.environ.get('DRONE_BUILD_EVENT') != 'push':
        return services
    before = os.environ.get('DRONE_COMMIT_BEFORE', '')
    after = os.environ.get('DRONE_COMMIT_AFTER', '')
    for revision in (before, after):
        if not re.fullmatch(r'(?:[0-9a-fA-F]{40}|[0-9a-fA-F]{64})', revision):
            return services
        if set(revision) == {'0'}:
            return services
        found = subprocess.run(['git', 'cat-file', '-e', revision + '^{commit}'],
                               stdout=subprocess.DEVNULL,
                               stderr=subprocess.DEVNULL)
        if found.returncode:
            return services
    result = subprocess.run(
        ['git', 'diff', '--name-only', '--no-renames', '-z', before, after, '--'],
        capture_output=True)
    if result.returncode:
        return services
    selected = set()
    for name in result.stdout.split(b'\0'):
        if not name:
            continue
        path = name.decode('utf-8', errors='surrogateescape')
        parts = path.split('/')
        if len(parts) >= 3 and parts[0] == 'services' and parts[1] in services:
            selected.add(parts[1])
        elif path.startswith('docs/'):
            continue
        else:
            return services
    return selected

Path('.ci-services').write_text('\n'.join(sorted(affected())) + '\n')
```

This uses [Git's NUL-delimited name output](https://git-scm.com/docs/git-diff) so filenames with spaces or newlines do not split into fake paths. Disabling rename detection represents moves as deletion and addition, allowing both old and new service locations to affect the selection.

The `docs/` exclusion is a policy assumption: those files must not influence generated clients, runtime schemas, or the documentation build you promise to test. Give documentation its own required check if needed. Shared libraries, root lockfiles, CI scripts, and unknown paths cause a full run in this example.

## Apply the plan to expensive work

A single pipeline can compute the plan once, then let service steps run or skip their commands:

```yaml
kind: pipeline
type: docker
name: affected-services
steps:
  - name: plan
    image: alpine:3.22
    commands:
      - apk add --no-cache python3 git
      - python3 ci/affected_services.py
    depends_on: []
  - name: api
    image: node:24
    commands:
      - test -s .ci-services
      - if grep -qx api .ci-services; then ./ci/test-service api; fi
    depends_on:
      - plan
  - name: worker
    image: node:24
    commands:
      - test -s .ci-services
      - if grep -qx worker .ci-services; then ./ci/test-service worker; fi
    depends_on:
      - plan
  - name: web
    image: node:24
    commands:
      - test -s .ci-services
      - if grep -qx web .ci-services; then ./ci/test-service web; fi
    depends_on:
      - plan
```

Provide the project-specific `ci/test-service` command and use runtime images appropriate to each service. The plan file always contains at least a newline; a missing file fails the consumer check rather than silently skipping tests. For stronger auditing, store structured selection output with an explicit format version, baseline, and fallback reason.

## Extend the dependency model carefully

A shared library may affect only two services, but that relationship must come from maintained dependency information. Add transitive dependents, generated code, build tooling, and deployment manifests to the model before replacing the full-run fallback.

Pull requests require a verified target-branch baseline and typically a merge-base calculation appropriate to your checkout strategy. The example intentionally runs all services for them. Shallow clones, new branches with zero before-SHAs, force pushes with missing objects, and inaccessible comparison APIs must also fall back rather than appear unchanged.

Test a service edit, shared-code edit, cross-service rename, deletion, documentation-only change, malformed SHA, and missing Git object. Periodically compare selective results with full builds. The optimization is trustworthy when its unknown cases remain visible and conservative while its known cases measurably reduce expensive work.
