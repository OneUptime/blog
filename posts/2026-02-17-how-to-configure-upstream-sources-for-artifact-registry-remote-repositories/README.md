# How to Configure Upstream Sources for Artifact Registry Remote Repositories

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Artifact Registry, Remote Repository, Upstream Sources, Package Management, DevOps

Description: Learn how to configure and manage upstream sources for Artifact Registry remote repositories to proxy npm, Maven, PyPI, and other package registries.

---

Remote repositories in Artifact Registry can proxy more than just Docker Hub. You can set up upstream sources for npm, Maven, PyPI, and other package registries. This gives your builds a local cache of external packages, reduces dependency on third-party registries, and speeds up package resolution.

Let me walk through configuring upstream sources for the different package formats that Artifact Registry supports.

## Supported Upstream Sources

Artifact Registry supports remote repositories for these formats:

- **Docker**: Docker Hub, custom Docker registries
- **npm**: npmjs.org, custom npm registries
- **Maven**: Maven Central, custom Maven repositories
- **Python**: PyPI, custom PyPI repositories
- **Apt**: Debian and Ubuntu package repositories
- **Yum**: Red Hat and CentOS package repositories

## Creating a Remote npm Repository

Set up a proxy for the public npm registry:

```bash
# Create a remote npm repository that proxies npmjs.org
gcloud artifacts repositories create npm-proxy \
  --repository-format=npm \
  --location=us-central1 \
  --mode=remote-repository \
  --remote-repo-config-desc="npm registry proxy" \
  --remote-npm-repo=NPMJS \
  --project=my-project
```

Configure npm to use it:

```bash
# Get the registry URL
gcloud artifacts print-settings npm \
  --repository=npm-proxy \
  --location=us-central1 \
  --project=my-project
```

Add to your .npmrc:

```ini
# .npmrc - Use the remote npm repository as the registry
registry=https://us-central1-npm.pkg.dev/my-project/npm-proxy/
//us-central1-npm.pkg.dev/my-project/npm-proxy/:always-auth=true
```

Now when you run `npm install`, packages are fetched through the proxy and cached locally.

## Creating a Remote Maven Repository

Proxy Maven Central for Java projects:

```bash
# Create a remote Maven repository that proxies Maven Central
gcloud artifacts repositories create maven-proxy \
  --repository-format=maven \
  --location=us-central1 \
  --mode=remote-repository \
  --remote-repo-config-desc="Maven Central proxy" \
  --remote-mvn-repo=MAVEN-CENTRAL \
  --project=my-project
```

Configure it in your pom.xml:

```xml
<!-- pom.xml - Use Artifact Registry as a Maven proxy -->
<project>
  <repositories>
    <repository>
      <id>artifact-registry-proxy</id>
      <url>artifactregistry://us-central1-maven.pkg.dev/my-project/maven-proxy</url>
      <releases>
        <enabled>true</enabled>
      </releases>
      <snapshots>
        <enabled>true</enabled>
      </snapshots>
    </repository>
  </repositories>

  <build>
    <extensions>
      <extension>
        <groupId>com.google.cloud.artifactregistry</groupId>
        <artifactId>artifactregistry-maven-wagon</artifactId>
        <version>2.2.1</version>
      </extension>
    </extensions>
  </build>
</project>
```

## Creating a Remote Python Repository

Proxy PyPI for Python projects:

```bash
# Create a remote Python repository that proxies PyPI
gcloud artifacts repositories create pypi-proxy \
  --repository-format=python \
  --location=us-central1 \
  --mode=remote-repository \
  --remote-repo-config-desc="PyPI proxy" \
  --remote-python-repo=PYPI \
  --project=my-project
```

Configure pip to use it:

```bash
# Install packages through the proxy
pip install \
  --index-url https://us-central1-python.pkg.dev/my-project/pypi-proxy/simple/ \
  requests flask pandas
```

Or set it in your pip.conf:

```ini
# pip.conf - Use Artifact Registry as the PyPI proxy
[global]
index-url = https://us-central1-python.pkg.dev/my-project/pypi-proxy/simple/
```

## Configuring Custom Upstream Sources

For registries other than the built-in presets, you can specify a custom upstream URL:

```bash
# Create a remote Docker repository that proxies a custom registry
gcloud artifacts repositories create custom-proxy \
  --repository-format=docker \
  --location=us-central1 \
  --mode=remote-repository \
  --remote-repo-config-desc="Custom registry proxy" \
  --remote-docker-repo="https://registry.example.com" \
  --project=my-project
```

For custom registries that require authentication:

```bash
# Store the registry credentials in Secret Manager
echo -n "registry-password" | \
  gcloud secrets create custom-registry-password \
    --data-file=- \
    --project=my-project

# Create the remote repository with authentication
gcloud artifacts repositories create custom-proxy-auth \
  --repository-format=docker \
  --location=us-central1 \
  --mode=remote-repository \
  --remote-docker-repo="https://registry.example.com" \
  --remote-username=my-username \
  --remote-password-secret-version=projects/my-project/secrets/custom-registry-password/versions/latest \
  --project=my-project
```

## Creating Apt Remote Repositories

For Debian and Ubuntu package repositories:

```bash
# Create a remote Apt repository that proxies Ubuntu's main repository
gcloud artifacts repositories create ubuntu-proxy \
  --repository-format=apt \
  --location=us-central1 \
  --mode=remote-repository \
  --remote-repo-config-desc="Ubuntu package proxy" \
  --remote-apt-repo="https://archive.ubuntu.com/ubuntu" \
  --project=my-project
```

This is particularly useful for Docker builds that run `apt-get install` - pulling packages through a local proxy is faster and more reliable.

## Managing Multiple Upstream Sources

If your project depends on packages from multiple registries, create a remote repository for each and then combine them using a virtual repository (covered in a separate post):

```bash
# Create proxies for different registries
gcloud artifacts repositories create github-npm-proxy \
  --repository-format=npm \
  --location=us-central1 \
  --mode=remote-repository \
  --remote-npm-repo="https://npm.pkg.github.com" \
  --remote-username=github-user \
  --remote-password-secret-version=projects/my-project/secrets/github-token/versions/latest \
  --project=my-project

gcloud artifacts repositories create npmjs-proxy \
  --repository-format=npm \
  --location=us-central1 \
  --mode=remote-repository \
  --remote-npm-repo=NPMJS \
  --project=my-project
```

## Monitoring Upstream Connectivity

Check if your remote repositories can reach their upstream sources:

```bash
# List remote repositories and their upstream status
gcloud artifacts repositories list \
  --location=us-central1 \
  --project=my-project \
  --filter="mode=REMOTE_REPOSITORY"
```

If the upstream is down, the remote repository will still serve cached packages. Packages that are not in the cache will fail to resolve until the upstream comes back.

## Terraform Configuration

Define remote repositories for multiple formats in Terraform:

```hcl
# main.tf - Remote repositories for common upstream sources

# npm proxy
resource "google_artifact_registry_repository" "npm_proxy" {
  location      = "us-central1"
  repository_id = "npm-proxy"
  format        = "NPM"
  mode          = "REMOTE_REPOSITORY"

  remote_repository_config {
    npm_repository {
      public_repository = "NPMJS"
    }
  }
}

# Maven Central proxy
resource "google_artifact_registry_repository" "maven_proxy" {
  location      = "us-central1"
  repository_id = "maven-proxy"
  format        = "MAVEN"
  mode          = "REMOTE_REPOSITORY"

  remote_repository_config {
    maven_repository {
      public_repository = "MAVEN_CENTRAL"
    }
  }
}

# PyPI proxy
resource "google_artifact_registry_repository" "pypi_proxy" {
  location      = "us-central1"
  repository_id = "pypi-proxy"
  format        = "PYTHON"
  mode          = "REMOTE_REPOSITORY"

  remote_repository_config {
    python_repository {
      public_repository = "PYPI"
    }
  }
}

# Docker Hub proxy
resource "google_artifact_registry_repository" "dockerhub_proxy" {
  location      = "us-central1"
  repository_id = "dockerhub-proxy"
  format        = "DOCKER"
  mode          = "REMOTE_REPOSITORY"

  remote_repository_config {
    docker_repository {
      public_repository = "DOCKER_HUB"
    }
  }
}
```

## Cache Management for Remote Repositories

Remote repository caches grow over time. Use cleanup policies to manage them just like standard repositories:

```bash
# Apply a cleanup policy to the remote repository
cat > remote-cleanup.json << 'EOF'
[
  {
    "id": "delete-old-cached-packages",
    "action": { "type": "Delete" },
    "condition": { "olderThan": "7776000s" }
  }
]
EOF

gcloud artifacts repositories set-cleanup-policies npm-proxy \
  --location=us-central1 \
  --policy=remote-cleanup.json \
  --project=my-project
```

This deletes cached packages older than 90 days. If someone requests the package again, it will be re-fetched from the upstream.

## Wrapping Up

Configuring upstream sources for Artifact Registry remote repositories gives your builds a resilient, fast, and local cache for external packages. Whether you are proxying Docker Hub, npm, Maven Central, or PyPI, the setup follows the same pattern: create the remote repository, point it at the upstream, and configure your tools to use the Artifact Registry URL. The cache handles the rest, keeping your builds running even when upstream registries are slow or rate-limited.
