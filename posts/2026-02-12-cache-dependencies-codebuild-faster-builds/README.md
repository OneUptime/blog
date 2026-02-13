# How to Cache Dependencies in CodeBuild for Faster Builds

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CodeBuild, Caching, CI/CD, Performance

Description: Learn how to dramatically speed up AWS CodeBuild builds by caching dependencies, Docker layers, and build artifacts using S3 and local caching strategies.

---

Every minute your build spends downloading dependencies is a minute wasted. A typical Node.js project might spend 45 seconds running `npm install`, a Java project might burn 2 minutes pulling Maven dependencies, and Docker builds can waste minutes re-downloading base images. Multiply that by 50 builds a day, and you've got serious time (and money) going down the drain.

CodeBuild supports two caching strategies: S3 caching and local caching. S3 caching stores your cache in a bucket and restores it at the start of each build. Local caching keeps files on the build host between builds. Both can cut your build times significantly, but they work differently and have different trade-offs.

## S3 Caching

S3 caching is the most flexible option. The cache is uploaded to S3 after each build and downloaded at the start of the next one. It works across different build hosts and survives even when CodeBuild's compute fleet scales down.

### Setting Up S3 Caching

```bash
# Create an S3 bucket for build cache
aws s3 mb s3://my-codebuild-cache --region us-east-1

# Set a lifecycle policy to expire old cache files
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-codebuild-cache \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "expire-cache",
      "Status": "Enabled",
      "Filter": {},
      "Expiration": {"Days": 30}
    }]
  }'

# Create or update the CodeBuild project with S3 cache
aws codebuild update-project \
  --name my-app-build \
  --cache '{
    "type": "S3",
    "location": "my-codebuild-cache/my-app-build"
  }'
```

Now specify what to cache in your buildspec.

```yaml
# buildspec.yml with S3 caching for Node.js
version: 0.2

phases:
  install:
    runtime-versions:
      nodejs: 20
    commands:
      - echo "Cache status:"
      - ls -la node_modules/ 2>/dev/null && echo "Cache hit!" || echo "Cache miss"
      - npm ci

  build:
    commands:
      - npm test
      - npm run build

cache:
  paths:
    # Node.js dependencies
    - "node_modules/**/*"
    # npm cache directory
    - "/root/.npm/**/*"
```

### S3 Caching for Different Languages

Each language ecosystem has its own dependency directories. Here are the common ones.

```yaml
# Python
cache:
  paths:
    - "/root/.cache/pip/**/*"
    - ".venv/**/*"

# Java (Maven)
cache:
  paths:
    - "/root/.m2/**/*"

# Java (Gradle)
cache:
  paths:
    - "/root/.gradle/caches/**/*"
    - "/root/.gradle/wrapper/**/*"

# Go
cache:
  paths:
    - "/go/pkg/mod/**/*"
    - "/root/.cache/go-build/**/*"

# Ruby
cache:
  paths:
    - "vendor/bundle/**/*"

# Rust
cache:
  paths:
    - "/root/.cargo/registry/**/*"
    - "/root/.cargo/git/**/*"
    - "target/**/*"
```

## Local Caching

Local caching is faster because there's no S3 upload/download step. The cache stays on the build host's local disk. The downside is that if CodeBuild assigns your build to a different host, you get a cache miss.

In practice, if you're building frequently (several times per hour), local caching works great because CodeBuild tends to reuse the same hosts.

```bash
# Enable local caching with multiple modes
aws codebuild update-project \
  --name my-app-build \
  --cache '{
    "type": "LOCAL",
    "modes": [
      "LOCAL_DOCKER_LAYER_CACHE",
      "LOCAL_SOURCE_CACHE",
      "LOCAL_CUSTOM_CACHE"
    ]
  }'
```

The three local cache modes:

- **LOCAL_DOCKER_LAYER_CACHE**: Caches Docker image layers. Essential for Docker builds.
- **LOCAL_SOURCE_CACHE**: Caches the Git source. Speeds up large repository clones.
- **LOCAL_CUSTOM_CACHE**: Caches the paths you specify in the buildspec `cache` section.

When using local caching, you still need the `cache` section in your buildspec for `LOCAL_CUSTOM_CACHE`.

```yaml
# buildspec.yml with local custom caching
version: 0.2

phases:
  install:
    commands:
      - npm ci

  build:
    commands:
      - npm run build

# These paths are cached locally between builds
cache:
  paths:
    - "node_modules/**/*"
    - "/root/.npm/**/*"
```

## Comparing S3 and Local Caching

| Factor | S3 Cache | Local Cache |
|--------|----------|-------------|
| Reliability | Always available | May miss if different host |
| Speed | Slower (S3 transfer) | Faster (local disk) |
| Cross-build persistence | Yes | Until host is recycled |
| Docker layer caching | Not supported | Supported |
| Cost | S3 storage + transfer | Free |
| Best for | Infrequent builds | Frequent builds |

For most projects, I'd recommend starting with local caching and falling back to S3 if you're seeing too many cache misses.

## Optimizing npm/Yarn Caching

For JavaScript projects, the biggest gain comes from caching `node_modules` properly.

```yaml
version: 0.2

phases:
  install:
    runtime-versions:
      nodejs: 20
    commands:
      # Use npm ci instead of npm install for deterministic builds
      # npm ci is faster when node_modules exists and matches the lockfile
      - npm ci --prefer-offline

  build:
    commands:
      - npm run build

cache:
  paths:
    - "node_modules/**/*"
    # Cache the npm global cache too
    - "/root/.npm/**/*"
```

The `--prefer-offline` flag tells npm to use cached packages when available, only going to the network when something isn't in cache.

For Yarn v2+:

```yaml
phases:
  install:
    commands:
      - yarn install --immutable

cache:
  paths:
    - ".yarn/cache/**/*"
```

## Optimizing Docker Build Caching

Docker builds benefit enormously from caching, but you need the right approach.

```yaml
version: 0.2

env:
  variables:
    DOCKER_BUILDKIT: "1"

phases:
  pre_build:
    commands:
      - aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
      # Pull the previous image to use as cache
      - docker pull $ECR_REGISTRY/my-app:latest || true

  build:
    commands:
      # Build using the pulled image as cache source
      - |
        docker build \
          --cache-from $ECR_REGISTRY/my-app:latest \
          --build-arg BUILDKIT_INLINE_CACHE=1 \
          -t $ECR_REGISTRY/my-app:$COMMIT_HASH \
          -t $ECR_REGISTRY/my-app:latest \
          .

  post_build:
    commands:
      - docker push $ECR_REGISTRY/my-app:$COMMIT_HASH
      - docker push $ECR_REGISTRY/my-app:latest
```

Combined with `LOCAL_DOCKER_LAYER_CACHE`, this gives you two levels of caching: local Docker layer cache for back-to-back builds, and remote cache-from for when you land on a fresh host.

## Optimizing Maven Caching

Maven downloads can be painfully slow. Cache the entire `.m2` directory.

```yaml
version: 0.2

phases:
  install:
    runtime-versions:
      java: corretto21
    commands:
      # Resolve dependencies before building (to separate cache from build)
      - mvn dependency:resolve dependency:resolve-plugins -q

  build:
    commands:
      - mvn clean package -DskipTests=false -q

cache:
  paths:
    - "/root/.m2/**/*"
```

For Gradle, the cache structure is a bit different.

```yaml
cache:
  paths:
    - "/root/.gradle/caches/**/*"
    - "/root/.gradle/wrapper/**/*"
    - ".gradle/**/*"
    - "build/**/*"
```

## Measuring Cache Effectiveness

You can't improve what you don't measure. Track your build times to see if caching is working.

```bash
# Get build durations for the last 20 builds
aws codebuild list-builds-for-project \
  --project-name my-app-build \
  --sort-order DESCENDING \
  --max-items 20 \
  --query 'ids' --output text | tr '\t' '\n' | while read build_id; do
    aws codebuild batch-get-builds --ids "$build_id" \
      --query 'builds[0].{Id:id,Duration:phases[?phaseType==`INSTALL`].durationInSeconds|[0],Status:buildStatus}'
  done
```

A good caching setup should show the install phase dropping from minutes to seconds after the first build.

## Troubleshooting Cache Issues

When caching doesn't seem to work:

- **Check the cache path glob syntax.** It must be `node_modules/**/*`, not `node_modules/`.
- **Check S3 permissions.** The CodeBuild role needs `s3:GetObject` and `s3:PutObject` on the cache bucket.
- **Watch for lockfile changes.** If `package-lock.json` changes, `npm ci` will blow away `node_modules` anyway. That's correct behavior, but it means the cache provides no benefit when dependencies change.
- **Check build logs for cache messages.** CodeBuild logs whether the cache was restored or not at the beginning of the build.

```yaml
# Add debugging to see cache status
phases:
  install:
    commands:
      - echo "Checking cache..."
      - du -sh node_modules 2>/dev/null || echo "No node_modules cache"
      - ls -la /root/.m2/repository 2>/dev/null | head -5 || echo "No Maven cache"
```

For monitoring your overall build pipeline health, set up [CloudWatch alarms](https://oneuptime.com/blog/post/2026-02-12-set-up-cloudwatch-alarms-for-ec2-cpu-and-memory/view) on build duration metrics. A sudden increase in build time usually means your cache stopped working.

Proper caching is one of the highest-impact optimizations you can make to your CI pipeline. A few minutes of configuration can save hours of build time per week, and your developers will thank you for the faster feedback loops.
