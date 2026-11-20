# MLRun V3IO 'Unauthorized path': Check UIDs, Ownership, and Security-Admin Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MLOps, Security, Kubernetes, Troubleshooting

Description: Diagnose V3IO path authorization by comparing the job identity, numeric ownership, data policies, and the separate responsibilities of security administrators.

An `Unauthorized path` error during an MLRun job is not enough evidence to change a directory's permissions. First determine which component rejected the request and which identity it evaluated. A notebook user, a job's operating-system user, and the identity behind a V3IO access key can differ.

Capture the failing operation, storage URL, run identifier, and relevant traceback without including credentials. Check whether the rejection came from the V3IO data service, a filesystem operation, or an MLRun path restriction before applying a data-layer repair. The same visible directory name can be reached through different protocols with different authentication paths.

## Separate project access from data access

Iguazio distinguishes management policies, project membership, data-access policies, and POSIX permissions. Being able to open a project and launch its jobs does not by itself authorize access to its stored data. Security Admin manages users and groups; it is not a blanket data-access grant. [Iguazio authorization documentation](https://www.iguazio.com/docs/latest-release/users-and-security/authorization/)

This matters when an administrator can inspect a failed run but cannot read the input file. That observation does not necessarily indicate an inconsistent permission system. Check the identity used for the actual read instead of assuming that the person viewing the run supplies it.

Build a small comparison for the failing and working environments:

| Evidence | Notebook | Remote job |
|---|---|---|
| Platform user associated with the credential | Record username | Record username |
| Process UID and group IDs | Inspect locally | Inspect inside job |
| Storage interface | Mounted path or API | Mounted path or API |
| Exact data path | Include container and prefix | Include container and prefix |

Avoid copying access-key values into this table. Have the platform administrator confirm which account owns each configured credential.

## Inspect numeric ownership at the failure point

For a mounted V3IO path, run read-only identity and metadata checks in the environment where the operation fails:

```bash
id
ls -ldn /v3io/projects
ls -ldn /v3io/projects/your-project
ls -ldn /v3io/projects/your-project/data
ls -ln /v3io/projects/your-project/data/input.csv
```

Replace the paths with the actual mount and object. Numeric output avoids confusing a locally resolved username with the UID recorded on a file. Inspect parent directories as well as the file; directory traversal permissions can block access before file contents are considered.

If ACL inspection is available in the image and supported for the mount, use it to examine additional grants. Preserve the evidence before changing ownership. A recursive ownership change across a shared project can fix one job while breaking another workload's expected access.

Compare the numeric values with the intended platform user's configured UID and groups. Iguazio's management SDK distinguishes its database user identifier from the numeric UID, so do not compare an API object ID with filesystem ownership. [Iguazio Users API](https://www.iguazio.com/docs/latest-release/cluster-mgmt/mgmt-sdk/users-sdk/)

## Check the credential and policy layers

For Web API access, verify the account behind `V3IO_ACCESS_KEY` and the configured `V3IO_API` endpoint. `V3IO_USERNAME` also affects some path-resolution behavior; changing that string does not replace the authenticated identity of an existing access key. [MLRun V3IO datastore configuration](https://docs.mlrun.org/en/stable/store/datastore.html#v3io)

Have the administrator check the Data management policy, the relevant data-access rules, and POSIX access for that identity. Iguazio evaluates group membership differently across layers: management policies and POSIX permissions can come from all groups, while group-based data-access rules use the primary group. [Iguazio authorization layers](https://www.iguazio.com/docs/latest-release/users-and-security/authorization/#data-access-authorization)

A useful diagnostic is a read of one known permitted object and one failing object through the same interface and identity. If the permitted read succeeds, focus on the path-specific rules and ownership. If both fail, investigate authentication, account status, endpoint selection, and broader permissions first.

## Handle UID 1 as an administrative recovery mechanism

Iguazio documents creating a platform user with UID 1 to read files belonging to absent users. That is a specific administrative recovery capability. It is not equivalent to setting a Kubernetes container's operating-system UID to 0, and it should not become the ordinary identity of a training job. [Iguazio absent-user recovery documentation](https://www.iguazio.com/docs/latest-release/users-and-security/users/#accessing-projects-and-other-files-of-absent-users)

Repair the intended user's mapping, grant the needed path access, or transfer ownership through the established administrative process. Then rerun a minimal read with the original workload identity. Verify writing separately if the job produces artifacts: successful input access does not prove the output directory permits creation or updates.
