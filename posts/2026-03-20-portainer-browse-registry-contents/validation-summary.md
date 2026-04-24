# Validation Summary: How to Browse Registry Contents in Portainer Business Edition (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Container registries
- Docker Registry HTTP API V2 / Docker Registry API v2
- Harbor
- Amazon ECR
- Azure Container Registry (ACR)
- GitHub Container Registry (GHCR)
- GitLab Container Registry

## Sources Consulted
- Portainer Docs: Browse a registry - https://docs.portainer.io/admin/registries/browse
- Portainer Docs: Manage a registry - https://docs.portainer.io/admin/registries/manage
- Portainer Docs: Registries (environment access management) - https://docs.portainer.io/user/docker/host/registries
- Portainer Docs: Registries (Kubernetes) - https://docs.portainer.io/user/kubernetes/cluster/registries
- Portainer Docs: Add a new registry - https://docs.portainer.io/admin/registries/add
- Portainer Docs: Add an AWS ECR registry - https://docs.portainer.io/admin/registries/add/ecr
- Portainer Docs: Add a GitHub registry - https://docs.portainer.io/admin/registries/add/ghcr
- Portainer Docs: Add a GitLab registry - https://docs.portainer.io/admin/registries/add/gitlab
- Portainer Docs source: `manage.md` in `portainer/portainer-docs` - https://github.com/portainer/portainer-docs/blob/2.39/admin/registries/manage.md
- CNCF Distribution: HTTP API V2 - https://distribution.github.io/distribution/spec/api/
- CNCF Distribution: Garbage collection - https://distribution.github.io/distribution/about/garbage-collection/
- Harbor Docs: Detagging Artifacts - https://goharbor.io/docs/main/working-with-projects/working-with-images/deleting-tags/
- Harbor Docs: Creating a Replication Rule - https://goharbor.io/docs/edge/administration/configuring-replication/create-replication-rules/
- Amazon ECR Docs: Viewing image details - https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-info.html
- Amazon ECR Docs: Deleting an image - https://docs.aws.amazon.com/AmazonECR/latest/userguide/delete_image.html
- Amazon ECR Docs: Private image replication - https://docs.aws.amazon.com/AmazonECR/latest/userguide/replication.html

## Issues Found
- The post described the registry browser as a hierarchy/tree of repositories and tags. Portainer documents it as a repository list with tag counts, so the example was corrected to show a repository list instead.
- The tag table was inaccurate. The original post claimed Portainer shows digest, creation date, and image size; current Portainer documentation and screenshots show tag listings with fields such as tag name, OS/architecture, image ID, compressed size, and created date. The example and explanatory bullets were corrected.
- The post claimed you can click a tag or Deploy button in the registry browser to pre-fill a deployment directly. I did not find this in current Portainer documentation, so the section was corrected to describe using the exact repository and tag from the browser in Portainer deployment forms.
- The tag deletion workflow was wrong. Portainer documents selecting a tag with a checkbox and using Remove, not clicking a trash icon on a tag row. The steps were corrected.
- The deletion explanation was inaccurate because deleting a manifest/tag does not automatically free storage immediately. CNCF Distribution documents that deleted content becomes eligible for garbage collection, and storage is reclaimed when garbage collection removes unreferenced blobs. The text was corrected accordingly.
- The retagging/tagging section used unsupported UI wording. Current Portainer documentation describes cloning/adding a tag from an existing image/tag, so the instructions were corrected to match documented behavior without claiming an unsupported standalone Tag action.
- The metadata section claimed Portainer exposes per-tag layer and label inspection from the registry browser. I did not find support for that in Portainer's registry browser docs, so the section was corrected to the documented repository summary and tag list view.
- The access control section was inaccurate. Portainer documents registry access as per-environment access management through an environment's Registries view, with users/teams or Kubernetes namespaces, not Admin/Read only/No access roles on a global registry page. The section was corrected.
- The comparison table had incorrect feature claims, including direct deployment from the browser and Amazon ECR lacking replication policies. The table was corrected to features verified in Portainer, Harbor, and Amazon ECR documentation.

## Review Notes
- Portainer's current published materials are slightly inconsistent on tag creation wording: the 2.39 `manage.md` source describes cloning an existing tag, while current search snippets and screenshots also show an Add tag control. The post was updated with neutral wording that stays accurate across both presentations.
