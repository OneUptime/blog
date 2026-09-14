# Cache Gradle and Maven Dependencies in Docker with BuildKit Mounts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, BuildKit, Gradle, Maven, CI/CD

Description: Keep Gradle and Maven dependency repositories in BuildKit cache mounts, preserve build outputs outside those mounts, and handle credentials and concurrent access correctly.

---

A Java build image does not need to contain a copy of every downloaded Maven or Gradle dependency. BuildKit cache mounts let a package repository persist on the builder while remaining outside the filesystem changes committed by the `RUN` instruction.

This is different from deleting a repository in a later layer: files copied or downloaded into an earlier ordinary layer remain part of that layer's history. Put dependency storage on the mount from the start, and copy only application outputs into the runtime stage. [Dockerfile cache mounts](https://docs.docker.com/reference/dockerfile/#run---mounttypecache).

## Cache Maven's Repository Directory

For a Maven project with `pom.xml` and `src`, a minimal build stage is:

```dockerfile
# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml ./
COPY src ./src
RUN --mount=type=cache,id=maven-repository-jdk21,target=/root/.m2/repository,sharing=locked \
    mvn -B -ntp verify
```

The resulting project artifacts remain under `/workspace/target`; the dependency repository stays on the mount. Maven's settings reference defines the local repository location and allows overriding it. If your settings use another location, mount that path instead. [Maven settings](https://maven.apache.org/ref/3.9.11/maven-settings/settings.html).

For a multi-module build, copy all required parent and module POMs, source trees, Maven extensions, and configuration files. The simple example intentionally assumes one module.

You can add a preliminary dependency-resolution step after copying manifests, but do not assume `dependency:go-offline` resolves every dependency needed by every plugin and profile. The final build must still mount the repository and be able to resolve missing artifacts.

## Keep Credentials in a Separate Secret Mount

A private Maven repository often needs `settings.xml`. Mount it as a secret alongside the repository cache:

```dockerfile
RUN --mount=type=cache,id=maven-repository-jdk21,target=/root/.m2/repository,sharing=locked \
    --mount=type=secret,id=maven_settings,target=/root/.m2/settings.xml,required=true \
    mvn -B -ntp verify
```

```bash
docker buildx build \
  --secret id=maven_settings,src=/run/ci-secrets/maven-settings.xml \
  --load --tag java-build:ci .
```

Keep the secret outside the copied context and avoid mounting the whole `.m2` directory as a shared cache that might accidentally accumulate credentials. A secret mount protects the file from automatic layer persistence, but the build commands must still avoid copying or logging it. [Docker build secrets](https://docs.docker.com/build/building/secrets/).

Downloaded private dependencies remain sensitive even when credentials are excluded. Restrict access to the builder and any exported cache that can contain private build outputs.

## Set an Explicit Gradle User Home

For a Gradle Wrapper project, an explicit user home makes the mount location unambiguous:

```dockerfile
# syntax=docker/dockerfile:1
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace
ENV GRADLE_USER_HOME=/var/cache/gradle
COPY . .
RUN chmod +x gradlew
RUN --mount=type=cache,id=gradle-home-jdk21,target=/var/cache/gradle,sharing=locked \
    ./gradlew --no-daemon build
```

The wrapper distribution and Gradle caches live under the mounted user home. Project outputs remain under the repository's build directories. Add `.git`, local `.gradle` directories, local build outputs, and secret files to `.dockerignore` according to your project structure.

This pattern prioritizes correct dependency reuse when the build reruns. It does not promise that source changes leave the entire Gradle instruction cached. Fine-grained task output caching is Gradle's separate mechanism and can be enabled after task inputs and outputs are correctly declared.

If you run Gradle as a non-root user, set the mount's ownership or use a writable user-specific target. The `uid` and `gid` mount options initialize permissions for a new cache directory; also inspect ownership of existing reused caches.

## Serialize Shared Mutable Repositories

`sharing=locked` prevents simultaneous BuildKit operations from writing the same mount at once. This is a conservative choice for dependency repositories shared across builds.

Gradle documents that concurrent writable dependency-cache access assumes the processes can communicate, which often is not true for separate containers. Its supported shared read-only cache has different rules. Do not equate a filesystem that all containers can mount with a safely shared writable Gradle cache. [Gradle dependency caching](https://docs.gradle.org/current/userguide/dependency_caching.html).

If locking becomes a bottleneck, partition caches by independent workload or use a managed read-only seed plus per-build writable state. Do not remove the lock without checking the package manager's concurrency contract.

## Copy Only the Runtime Artifact

Add a runtime stage appropriate to your application. For an executable JAR with a stable known filename:

```dockerfile
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app
COPY --from=build /workspace/target/service.jar /app/service.jar
ENTRYPOINT ["java", "-jar", "/app/service.jar"]
```

This Maven example assumes the project configures `service.jar` as its executable artifact. For Gradle, use the correct file under `build/libs`. Avoid an ambiguous wildcard when the build produces sources, plain, and executable JARs.

The runtime stage does not inherit the build-stage filesystem. Cache mounts prevent dependency-store persistence in the build layer too; these are complementary benefits.

## Verify Both Image Contents and Cold Behavior

Build once, change a source file, and rebuild on the same builder. Confirm the build executes while existing dependencies are reused. Then build with an empty cache and verify correctness still holds.

Inspect the final image's filesystem or exported layers to ensure dependency repositories and credentials are absent. Do not interpret a warm local result as proof of persistence across CI runners: external layer-cache export does not automatically transfer mutable cache-mount contents. Arrange explicit mount persistence or use a persistent isolated builder when that reuse is required.

## References

- [Dockerfile cache mounts](https://docs.docker.com/reference/dockerfile/#run---mounttypecache)
- [Maven repository settings](https://maven.apache.org/ref/3.9.11/maven-settings/settings.html)
- [Gradle dependency caching](https://docs.gradle.org/current/userguide/dependency_caching.html)
- [Docker build secrets](https://docs.docker.com/build/building/secrets/)
