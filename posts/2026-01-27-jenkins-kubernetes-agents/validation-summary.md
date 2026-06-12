# Validation Summary: How to Configure Jenkins Agents on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Jenkins
- Jenkins Kubernetes plugin
- Jenkins Configuration as Code
- Jenkins Declarative Pipeline
- Kubernetes Pods, resources, volumes, ServiceAccounts, and PriorityClass
- Docker, Docker-in-Docker, Docker socket mounts
- Kaniko-compatible image builds
- Node.js, Go, Maven, kubectl, Trivy

## Sources Consulted
- Jenkins Kubernetes plugin documentation: https://plugins.jenkins.io/kubernetes/
- Jenkins Kubernetes pipeline step reference: https://www.jenkins.io/doc/pipeline/steps/kubernetes/
- Jenkins Configuration as Code Kubernetes demo: https://github.com/jenkinsci/configuration-as-code-plugin/blob/master/demos/kubernetes/README.md
- Jenkins Pipeline syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Pod priority and preemption documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Node.js release documentation: https://nodejs.org/en/about/previous-releases
- Go release history and support policy: https://go.dev/doc/devel/release
- GoogleContainerTools Kaniko repository archival notice: https://github.com/GoogleContainerTools/kaniko
- Chainguard Kaniko fork and image documentation: https://github.com/chainguard-forks/kaniko and https://images.chainguard.dev/directory/image/kaniko/overview

## Issues Found
- The Kubernetes cloud example described `retentionTimeout` as seconds. Changed the comment to minutes, matching the Jenkins Kubernetes plugin's cloud configuration.
- The basic pod template described `instanceCap` as the number of executors per pod. Changed it to describe the maximum concurrently running pods from the template.
- Declarative Pipeline examples used `label` as if it selected a globally configured pod template. Changed those examples to `inheritFrom`, which is the documented way for declarative Kubernetes agents to inherit configured pod templates.
- The PriorityClass example used the deprecated alpha annotation `scheduler.alpha.kubernetes.io/priorityClassName`. Replaced it with the stable `spec.priorityClassName` field.
- The resource example claimed to set pod-level resource limits while the YAML set container resources. Updated the comment to say the limits are on the agent container.
- Node.js and Go image tags included unsupported lines for the current review date. Updated Node examples from 20/18/20/22 to supported 24 and 22/24 examples, and updated Go from 1.22 to 1.26.
- The deployment pipeline used the archived GoogleContainerTools Kaniko image. Changed the example to use a maintained Kaniko fork image hosted from the user's own registry and updated the best-practice note to mention BuildKit, Buildah, or a maintained Kaniko fork.
- The Kaniko context used a relative `dir://.` value. Changed it to `dir://${WORKSPACE}` to use Jenkins' workspace path as the local build context.
- Several comments over-stated that a JNLP container is always required or must be first. Updated them to refer to the Jenkins agent container or agent injection.
- The security best-practice line said to store secrets in Kubernetes Secrets, not Jenkins credentials. Revised it to avoid plaintext Pipeline code while allowing Kubernetes Secrets or Jenkins credentials as appropriate.
- The performance best-practice line referenced "pod templates caching," which is not a documented Kubernetes plugin feature. Replaced it with dependency caches and pre-pulled images.

## Review Notes
- Several examples still use `latest` image tags for brevity, while the best-practices section recommends pinned tags for reproducibility. For production use, pin images by version or digest.
- Docker socket and Docker-in-Docker examples are technically valid but carry elevated security risk; the post correctly warns to avoid Docker socket mounts when possible.
