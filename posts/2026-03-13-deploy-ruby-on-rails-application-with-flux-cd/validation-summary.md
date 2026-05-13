# Validation Summary: How to Deploy a Ruby on Rails Application with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Ruby on Rails 7+
- Ruby and Puma
- Docker multi-stage builds
- PostgreSQL
- Kubernetes Jobs, Deployments, Services, Secrets, probes, and port forwarding
- Flux CD GitRepository and Kustomization
- Flux image automation policy markers

## Sources Consulted
- Rails Asset Pipeline guide: https://guides.rubyonrails.org/asset_pipeline.html
- Rails Getting Started guide: https://guides.rubyonrails.org/getting_started.html
- Rails API documentation for application Dockerfile asset precompile example: https://api.rubyonrails.org/v7.1.3.3/classes/Rails/Application.html
- Puma official documentation: https://puma.io/
- Docker Ruby/Rails containerization guide: https://docs.docker.com/guides/ruby/containerize/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes TTL-after-finished controller documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API v1 reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/

## Issues Found
- The introduction described Puma as a WSGI server. WSGI is a Python web server interface; Puma is a Ruby/Rack web server. Changed the text to "Rack server like Puma."
- The introduction said the article declares a Sidekiq worker Kustomization and orders web before workers, but no Sidekiq manifests are shown. Changed the sentence to describe Sidekiq as optional and to state the general dependency goal: migrations run before workloads that use the database.
- The migration Job used `ttlSecondsAfterFinished: 300` while the Flux Kustomization keeps the Job manifest reconciled from Git. Kubernetes would delete the completed Job after the TTL, and Flux could recreate it on a later reconciliation, rerunning the migration. Removed the TTL field so the version-stamped completed Job remains available for Flux health checking until a new release uses a new Job name.
- The tags line used "Ruby On Rail." Corrected it to "Ruby on Rails."

## Review Notes
- The Dockerfile pattern, `SECRET_KEY_BASE_DUMMY=1` asset precompile step, Puma command, Rails `/up` health probe, Kubernetes Service and Deployment snippets, Flux `dependsOn`, Flux `healthChecks`, and Flux image policy marker syntax match current official documentation.
- `kubectl` and `flux` were not installed in the local environment, so CLI command syntax was checked against official command references rather than local `--help` output.
- Long-running migrations may need an explicit Flux `spec.timeout` greater than the default timeout, depending on the application's migration duration.
