# How to Tag Docker Images from Drone Branch, Commit, and Git Tag Events Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, Docker, CI/CD, Git, DevOps

Description: Generate valid and predictable Docker tags from Drone events while preserving commit identity and restricting publishing.

A Git branch name is not automatically a valid Docker tag. Branches can contain slashes, two normalized branch names can collide, and a tag such as `latest` can be overwritten by whichever concurrent build finishes last. Define an explicit publishing rule before wiring Drone metadata into your registry.

The example below publishes a full commit tag for every allowed event, a readable branch-and-commit tag for pushes, and a checked release tag for Git tag events. Production deployments should record the pushed image digest as well as its human-readable tag.

## Generate tags in a script

Keep the logic in `ci/image-tags.py`. Reading metadata at runtime avoids turning branch text into shell syntax during YAML substitution.

```python
import os
import re
from pathlib import Path

sha = os.environ["DRONE_COMMIT_SHA"].lower()
if not re.fullmatch(r"[0-9a-f]{40}", sha):
    raise SystemExit("expected a full 40-character commit SHA")

event = os.environ["DRONE_BUILD_EVENT"]
tags = ["sha-" + sha]
if event == "push":
    branch = os.environ["DRONE_BRANCH"]
    slug = re.sub(r"[^a-z0-9_.-]+", "-", branch.lower()).strip(".-")
    slug = slug[:60] or "branch"
    tags.append("branch-" + slug + "-" + sha[:12])
elif event == "tag":
    release = os.environ["DRONE_TAG"]
    if not re.fullmatch(r"[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}", release):
        raise SystemExit("Git tag is not an accepted Docker tag")
    tags.append(release)
else:
    raise SystemExit("publishing is disabled for this event")

Path(".tags").write_text(",".join(tags), encoding="utf-8")
```

The tag pattern follows the registry reference implementation's [tag grammar](https://github.com/distribution/reference/blob/main/regexp.go). This example deliberately assumes a SHA-1 Git repository; adjust the commit validation when adopting a different Git object format. Do not silently shorten every identifier to the same length without reviewing collision risk.

The branch alias is for navigation. The full `sha-` tag preserves the commit identifier; adding a short commit suffix also avoids different branch builds constantly replacing one shared branch tag. Enforce registry immutability where available if even a repeated build of the same commit must not replace an existing image.

## Pass the result to the Docker plugin

Drone's Docker plugin reads a comma-separated `.tags` file from the workspace. The [plugin documentation](https://docs.drone.io/plugins/popular/docker/) describes that interface. The script must finish before publishing:

```yaml
kind: pipeline
type: docker
name: publish

trigger:
  event:
    - push
    - tag

steps:
  - name: tags
    image: python:3.13-alpine
    commands:
      - python ci/image-tags.py
  - name: publish
    image: plugins/docker
    settings:
      registry: registry.example.com
      repo: registry.example.com/acme/api
      username:
        from_secret: registry_username
      password:
        from_secret: registry_password
```

Pin the publishing plugin to a reviewed version or digest in your deployment. This example expects an existing Dockerfile and the Docker runner configuration needed by that plugin. Keep `.tags` out of source control so the script cannot accidentally consume stale tags when a build is changed or a step is skipped.

If publishing should be limited to selected branches, implement that restriction separately for push events. Drone's [trigger documentation](https://docs.drone.io/pipeline/docker/syntax/trigger/) notes that branch filtering does not work for tag events. A global `branch: main` condition is therefore not a reliable release publishing rule.

## Exercise the event matrix before pushing

Test the generator with disposable metadata and inspect `.tags` without invoking the publisher:

| Event and input | Expected behavior |
| --- | --- |
| Push to `feature/API` | Full commit tag plus `branch-feature-api-<short-sha>` |
| Tag `v2.4.1` | Full commit tag plus `v2.4.1` |
| Tag `release/2.4.1` | Rejected before publishing |
| Pull request | Rejected before publishing |
| Missing or malformed commit ID | Rejected before publishing |

Use the same exact commit and a registry with a disposable repository for the integration check. Verify all expected tags resolve to the same digest for that build. Then test two concurrent commits to ensure no deployment depends on finish order.

Finally, protect who can create release tags and who can change publishing code. A syntactically valid tag is not authorization to publish a trusted release. Keep publishing credentials unavailable to pull requests and grant the registry account only the required repository permissions.
