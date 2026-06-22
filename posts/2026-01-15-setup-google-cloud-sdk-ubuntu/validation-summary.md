# Validation Summary: How to Set Up Google Cloud SDK (gcloud) on Ubuntu

## Status
validated

## Post Type
Tutorial / installation and CLI guide

## Technologies Covered
- Ubuntu
- Google Cloud CLI / gcloud
- Google Cloud SDK components
- Google Cloud authentication and Application Default Credentials
- IAM and service accounts
- Compute Engine
- Google Kubernetes Engine
- Cloud Storage
- Cloud Shell

## Sources Consulted
- Google Cloud CLI install documentation: https://docs.cloud.google.com/sdk/docs/install-sdk
- Google Cloud CLI Snap package documentation: https://docs.cloud.google.com/sdk/docs/downloads-snap
- Google Cloud CLI component management documentation: https://docs.cloud.google.com/sdk/docs/components
- gcloud auth application-default print-access-token reference: https://docs.cloud.google.com/sdk/gcloud/reference/auth/application-default/print-access-token
- GKE kubectl authentication plugin documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/cluster-access-for-kubectl
- GKE release schedule: https://docs.cloud.google.com/kubernetes-engine/docs/release-schedule
- Compute Engine Spot VM documentation: https://docs.cloud.google.com/compute/docs/instances/create-use-spot
- Compute Engine preemptible VM documentation: https://docs.cloud.google.com/compute/docs/instances/preemptible
- gcloud storage buckets update reference: https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/update
- gcloud storage objects update reference: https://docs.cloud.google.com/sdk/gcloud/reference/storage/objects/update
- Cloud Shell documentation: https://docs.cloud.google.com/shell/docs/how-cloud-shell-works
- Cloud Shell gcloud usage documentation: https://docs.cloud.google.com/shell/docs/using-cloud-shell-with-gcloud-cli
- Ubuntu release list: https://ubuntu.com/project/docs/release-team/list-of-releases/

## Issues Found
- The prerequisites listed Ubuntu 20.04 as a normal supported LTS target. Ubuntu 20.04 reached the end of standard support in May 2025, so the prerequisite now recommends supported LTS releases such as Ubuntu 22.04 or 24.04 and notes that Ubuntu 20.04 requires Extended Security Maintenance.
- The prerequisites stated Python 3.8 or later. Current Google Cloud CLI documentation requires Python 3.10 to 3.14 when using an existing interpreter, so the version range was updated.
- The APT dependency list included `apt-transport-https` as required. Current Google Cloud documentation lists `ca-certificates`, `gnupg`, and `curl`, so the stale dependency was removed.
- The APT installation comment said `google-cloud-cli` installs "essential components." The package specifically includes `gcloud`, `gcloud alpha`, `gcloud beta`, `gsutil`, and `bq`, so the wording was corrected.
- The Snap install command used the old `google-cloud-sdk` snap package. The current package is `google-cloud-cli`, so the command was corrected.
- The Compute Engine cost-saving VM example used the older preemptible VM flags and an outdated discount claim. It now uses Spot VM flags and the current "up to 91%" discount wording.
- The GKE example pinned Kubernetes 1.28, which is no longer supported as of the current GKE release schedule. The example now uses a supported minor version, 1.33.
- The kubectl section did not mention the required GKE authentication plugin. The wording now notes that the plugin must be installed.
- The components section implied that `gcloud components install/update/remove` works for all installation methods. Google disables the component manager for APT and Snap installs, so the section now scopes those commands to archive/manual installations and gives an APT package example.
- The Cloud SQL proxy component ID was written as `cloud-sql-proxy`; the correct Cloud SDK component ID is `cloud_sql_proxy`.
- The Bigtable emulator component ID was written as `bigtable-emulator`; the correct component ID is `bigtable`.
- Troubleshooting, the cheat sheet, and the conclusion recommended `gcloud components update` without qualifying the installation method. These references now distinguish manual/archive installs from package-manager installs.

## Review Notes
Several service account key examples are technically valid, but future revisions should emphasize service account impersonation, Workload Identity Federation, or attached service accounts over long-lived JSON keys for production automation.
