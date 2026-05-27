# Validation Summary: How to Set Up Cloud Build Private Pools for Builds in a VPC Network

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Build
- Cloud Build private pools
- Google Cloud CLI (`gcloud`)
- VPC Network Peering / Service Networking
- Cloud DNS
- Cloud SQL private IP
- Google Kubernetes Engine private clusters
- Artifact Registry / Container Registry examples
- Secret Manager integration in Cloud Build

## Sources Consulted
- Cloud Build private pools overview: https://docs.cloud.google.com/build/docs/private-pools/private-pools-overview
- Set up environment to use private pools in a VPC network: https://docs.cloud.google.com/build/docs/private-pools/set-up-private-pool-to-use-in-vpc-network
- Create and manage private pools: https://docs.cloud.google.com/build/docs/private-pools/create-manage-private-pools
- Private pool configuration file schema: https://docs.cloud.google.com/build/docs/private-pools/private-pool-config-file-schema
- Run builds in a private pool: https://docs.cloud.google.com/build/docs/private-pools/run-builds-in-private-pool
- Cloud Build build configuration file schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud CLI reference for `gcloud builds worker-pools create`: https://cloud.google.com/sdk/gcloud/reference/builds/worker-pools/create
- Google Cloud CLI reference for `gcloud builds triggers create github`: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Access private GKE clusters with Cloud Build private pools: https://docs.cloud.google.com/build/docs/private-pools/accessing-private-gke-clusters-with-cloud-build-private-pools

## Issues Found
- The Service Networking allocated range example used `/24`. Google Cloud documentation recommends allocating a named range with prefix length `/24` or lower, and each private pool can use a `/24` from that range. Changed the example allocation to `/16`.
- The `--peered-network-ip-range` examples incorrectly used the allocated range name (`/private-pool-range`). The CLI and private pool schema require CIDR notation, such as `192.168.0.0/24` or `/29`. Updated both commands to use `192.168.0.0/24`.
- The machine and disk capability description said private pools support up to 32 vCPUs and 100 GB disk. Current Cloud Build private pools support a broader set of `e2`, `n2d`, and `c3` machine types and disk sizes from 100 GB to 4000 GB. Updated the description and machine-type note.
- The trigger example used `--worker-pool`, which is not a supported flag for `gcloud builds triggers create github`. Updated the text and command to rely on `options.pool.name` in the referenced `cloudbuild.yaml`.
- The Cloud SQL and private GKE examples implied that VPC peering alone is enough for all managed private endpoints. Added caveats that managed services reached through another peered network need explicit routing because VPC peering is not transitive.
- The egress section referred to routing through Google's default internet gateway. Updated it to state that private pool workers have external IPs by default and can be created or updated with no public egress.
- The cost section described paying for worker capacity and used vCPU-hours/GB-hours language. Updated it to match Cloud Build private pool pricing factors: worker machine type, build duration, and additional disk beyond the default 100 GB.

## Review Notes
`gcloud` was not installed in the local workspace, so CLI flags were validated against the official Google Cloud CLI reference instead of local `--help` output.
