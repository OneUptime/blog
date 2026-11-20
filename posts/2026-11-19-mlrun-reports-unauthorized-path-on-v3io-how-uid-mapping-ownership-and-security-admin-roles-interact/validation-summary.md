# Validation Summary: MLRun V3IO 'Unauthorized path': Check UIDs, Ownership, and Security-Admin Roles

## Status
validated

## Post Type
Technical troubleshooting guide containing shell commands and implementation-specific authorization guidance.

## Technologies Covered
- MLRun jobs, V3IO datastore configuration, and storage interfaces
- Iguazio platform users, management policies, project membership, and data-access policies
- POSIX numeric ownership, group membership, directory traversal, and ACLs
- Kubernetes container process identities
- Shell identity and metadata commands (`id` and `ls`)

## Sources Consulted
- [Iguazio authorization documentation](https://www.iguazio.com/docs/latest-release/users-and-security/authorization/): project versus data access, Security Admin responsibilities, Data policy, and group inheritance rules.
- [Iguazio Users API](https://www.iguazio.com/docs/latest-release/cluster-mgmt/mgmt-sdk/users-sdk/): numeric UID versus database user ID.
- [Iguazio absent-user recovery](https://www.iguazio.com/docs/latest-release/users-and-security/users/#accessing-projects-and-other-files-of-absent-users): Security Admin creation of a UID 1 user for file recovery.
- [MLRun V3IO datastore configuration](https://docs.mlrun.org/en/stable/store/datastore.html#v3io): `V3IO_API`, `V3IO_ACCESS_KEY`, and `V3IO_USERNAME` semantics.
- [MLRun storage attachment](https://docs.mlrun.org/en/stable/runtimes/function-storage.html): storage interfaces and automatic V3IO API configuration.
- [Iguazio Web API security](https://www.iguazio.com/docs/latest-release/services/data-layer/reference/web-apis/security/): authenticated data requests.
- [Kubernetes security contexts](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/): process UID, primary group, and supplementary groups.
- [Linux path resolution manual](https://man7.org/linux/man-pages/man7/path_resolution.7.html): directory search permissions and identity-based access checks.
- Installed operating-system `ls(1)` and `id(1)` manuals, read with `man ls` and `man id`: command syntax and numeric identity output. GNU manual fetches timed out and Open Group utility pages returned HTTP 403; these unavailable pages were not used as evidence.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The post is technically relevant and includes executable diagnostic commands, so the appropriate status is `validated`.
- Confirmed that project membership and Security Admin privileges do not themselves grant data access. The documented distinction between all-group management/POSIX inheritance and primary-group data-policy matching is accurate.
- Confirmed that the SDK user database ID differs from its numeric UID. UID 1 recovery is explicitly documented by Iguazio; a container process running as UID 0 is a separate configuration.
- Confirmed the three V3IO environment variable names and the username's role in home-directory resolution. Checking the credential owner separately from process identity is appropriate.
- Checked all five shell commands: `id` reports process identity; `ls -ldn` inspects directory metadata with numeric ownership; `ls -ln` does the same for the specified file. Paths are explicitly placeholders and require an actual mounted V3IO filesystem.
- Parent-directory traversal checks and separate read/write verification are appropriate. ACL inspection is correctly conditional on tool and mount support. Ownership changes are discussed as administrative repairs, without an unsafe executable recursive change.
- The product documentation links resolved to the intended resources. Iguazio's `latest-release` pages identify version 3.7; MLRun uses its moving `stable` documentation. Deployment-specific behavior should be compared with the installed versions.
- This was a documentation and command-semantics review. No live Iguazio cluster or failing MLRun job was available, so authorization failures and recovery operations were not reproduced. The error text alone does not identify a unique root cause, as the post correctly explains.
