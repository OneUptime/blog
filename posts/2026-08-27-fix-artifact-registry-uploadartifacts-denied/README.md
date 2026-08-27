# Why Artifact Registry Returns `uploadArtifacts` Denied After `gcloud auth configure-docker`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, Artifact Registry, Docker, IAM, gcloud

Description: Diagnose Artifact Registry push authorization by verifying the helper identity, repository path, and repository-scoped Writer role.

---

This command configures Docker authentication for an Artifact Registry hostname:

```bash
gcloud auth configure-docker LOCATION-docker.pkg.dev
```

It does not grant permission to upload an image. If Docker successfully obtains credentials but Artifact Registry reports that `artifactregistry.repositories.uploadArtifacts` is denied, authentication has progressed far enough to identify a caller, but that caller is not authorized for the repository addressed by the push.

## Verify the exact image destination

An Artifact Registry Docker image name has this structure:

```text
LOCATION-docker.pkg.dev/PROJECT_ID/REPOSITORY/IMAGE:TAG
```

The `PROJECT_ID` and `REPOSITORY` in this path select the destination. They are not replaced by the active gcloud `core/project` value.

Set and inspect each component explicitly:

```bash
LOCATION='us-west1'
REPOSITORY_PROJECT_ID='example-artifact-project'
REPOSITORY='application-images'
IMAGE='api'
TAG='release-2026-08-27'

TARGET_IMAGE="${LOCATION}-docker.pkg.dev/${REPOSITORY_PROJECT_ID}/${REPOSITORY}/${IMAGE}:${TAG}"
printf '%s\n' "${TARGET_IMAGE}"

gcloud artifacts repositories describe "${REPOSITORY}" \
  --location="${LOCATION}" \
  --project="${REPOSITORY_PROJECT_ID}"
```

Confirm that the repository exists in that project and location, that its format is Docker, and that its mode is standard. A typo in the location, project, or repository can look like an IAM failure because the grant applies to a different resource.

## Identify the principal used by the helper

The gcloud credential helper normally obtains credentials from the active gcloud CLI account. Inspect it before pushing:

```bash
gcloud auth list --filter=status:ACTIVE \
  --format='value(account)'
```

In CI, the active principal is often a service account rather than a user. If Docker runs under another operating-system user or through `sudo`, it can read a different Docker helper configuration and gcloud credential context. A different `DOCKER_CONFIG` changes which Docker client configuration, and therefore which registry helper, Docker uses.

Configure the exact registry hostname as the same user that runs Docker:

```bash
gcloud auth configure-docker "${LOCATION}-docker.pkg.dev"
```

The helper's job ends at supplying credentials. It does not create the repository or alter its IAM policy.

## Grant the repository Writer role

The predefined Artifact Registry Writer role, `roles/artifactregistry.writer`, includes `artifactregistry.repositories.uploadArtifacts`. Prefer a repository-level grant when the principal only pushes to one repository.

For a user:

```bash
CALLER_EMAIL='developer@example.com'

gcloud artifacts repositories add-iam-policy-binding "${REPOSITORY}" \
  --location="${LOCATION}" \
  --project="${REPOSITORY_PROJECT_ID}" \
  --member="user:${CALLER_EMAIL}" \
  --role='roles/artifactregistry.writer'
```

For a service account:

```bash
PUSH_SERVICE_ACCOUNT='image-pusher@example-artifact-project.iam.gserviceaccount.com'

gcloud artifacts repositories add-iam-policy-binding "${REPOSITORY}" \
  --location="${LOCATION}" \
  --project="${REPOSITORY_PROJECT_ID}" \
  --member="serviceAccount:${PUSH_SERVICE_ACCOUNT}" \
  --role='roles/artifactregistry.writer'
```

An IAM administrator should make the grant. Avoid granting Writer to `allUsers`, and avoid a project-wide grant when repository scope meets the requirement. IAM changes can take time to propagate, so retry after the policy update has propagated.

## Retry with a fully qualified tag

Tag a local image with the verified destination and push it:

```bash
SOURCE_IMAGE='api:local'

docker tag "${SOURCE_IMAGE}" "${TARGET_IMAGE}"
docker push "${TARGET_IMAGE}"
```

If the push still fails, capture the exact destination and error without sharing tokens. Recheck the allow policy attached to the repository:

```bash
gcloud artifacts repositories get-iam-policy "${REPOSITORY}" \
  --location="${LOCATION}" \
  --project="${REPOSITORY_PROJECT_ID}"
```

This command does not include inherited allow policies, IAM deny policies, or principal access boundary policies. Consider IAM conditions, group membership propagation, deny policies, and principal access boundary policies when a visible allow-policy binding does not apply to the request.

## Check adjacent causes without conflating them

Several failures occur at a similar point in a Docker workflow:

- A missing `docker-credential-gcloud` executable is a local helper problem, not repository IAM.
- A final `401 Unauthorized` usually indicates that the registry did not receive usable authentication.
- An `uploadArtifacts` denial indicates the identified principal lacks the required permission on the addressed repository, or the addressed repository path is not the one whose policy was updated.
- The immutable image tags setting rejects using an existing tag for a different image version even when upload permission is present. Use a new tag or follow the repository's release policy.
- Credentials for a Compute Engine VM's attached service account can also be constrained by the VM's access scopes in addition to IAM.

The Artifact Registry API must be enabled for the repository project, and a `pkg.dev` repository must already exist. Create-on-push roles apply only to `gcr.io` repositories in documented Container Registry migration workflows.

## Design production access deliberately

For automated builds, use a dedicated service account with Writer on only the required repositories. Prefer an attached identity or Workload Identity Federation over a service account key. Separate build identities from deployment identities when their permissions differ.

Reader cannot upload. Repository Administrator is broader because it can read, write, and delete artifacts. The documented Writer role is the narrower predefined role intended for reading and writing artifacts within an existing repository.

## Official Documentation

- [Configure Docker authentication](https://cloud.google.com/artifact-registry/docs/docker/authentication)
- [Artifact Registry access control](https://cloud.google.com/artifact-registry/docs/access-control)
- [Artifact Registry IAM roles and permissions](https://cloud.google.com/iam/docs/roles-permissions/artifactregistry)
- [Push and pull Docker images](https://cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling)
- [Artifact Registry Docker image names](https://cloud.google.com/artifact-registry/docs/docker/names)

## Conclusion

`gcloud auth configure-docker` connects Docker to an authentication helper; it does not authorize uploads. Verify the principal and the full `LOCATION-docker.pkg.dev/PROJECT/REPOSITORY` destination, then grant `roles/artifactregistry.writer` on that repository. Keeping helper, identity, path, and IAM checks separate makes the denied permission straightforward to resolve.
