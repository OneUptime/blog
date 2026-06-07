# Validation Summary: How to Use sbt for Build Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- sbt (Scala Build Tool) 1.9.x
- Scala 3.3.1
- ScalaTest, scalatestplus-mockito
- sbt plugins: sbt-scalafmt, sbt-native-packager, sbt-assembly, sbt-release, sbt-updates, sbt-scoverage, sbt-site
- http4s, Cats, Circe (used in example dependency declarations)
- Coursier (dependency resolution)
- Zinc (incremental compiler)
- Docker (via sbt-native-packager DockerPlugin)
- GitHub Actions

## Sources Consulted
- [sbt Reference Manual — In-process Class Loading](https://www.scala-sbt.org/1.x/docs/In-Process-Classloaders.html) (turbo / classLoaderLayeringStrategy)
- [sbt 1.4.x Release Notes](https://www.scala-sbt.org/1.x/docs/sbt-1.4-Release-Notes.html) (MiniDependencyTreePlugin and DependencyTreePlugin)
- [sbt 1.9.0 release notes (eed3si9n)](https://eed3si9n.com/sbt-1.9.0) (IntegrationTest deprecation)
- [sbt dependencyTree reference](https://www.scala-sbt.org/2.x/docs/en/reference/sbt-dependency-tree.html)
- [sbt-dependency-lock plugin docs](https://stringbean.github.io/sbt-dependency-lock/settings.html) (verifying dependencyLockFile is plugin-only)
- [Build pipelining PR (sbt#5703)](https://github.com/sbt/sbt/pull/5703) (usePipelining)
- [scalac-profiling SBT plugin docs](https://scalacenter.github.io/scalac-profiling/docs/plugins/sbt-plugin.html)
- [scalatestplus-mockito on Maven Central](https://central.sonatype.com/artifact/org.scalatestplus/mockito-4-11_2.13) (mockito-4-11 / 3.2.17.0 artifact verification)

## Issues Found

1. **`dependencyLockFile` presented as a built-in sbt setting.** The Reproducible Builds section used `ThisBuild / dependencyLockFile := Some(baseDirectory.value / "project" / "dependencies.lock")`, but this setting is not built into sbt — it is provided by the `sbt-dependency-lock` plugin, and the setting type is `File`, not `Option[File]`, so the snippet would not compile even with the plugin enabled. Replaced the snippet with an accurate comment that points to the `sbt-dependency-lock` plugin and explains it generates a `build.sbt.lock` file via `dependencyLockWrite`.

2. **Outdated `scalac-profiling` version and missing `CrossVersion.full`.** The Slow Compilation section used `addCompilerPlugin("ch.epfl.scala" %% "scalac-profiling" % "1.0.0")`. The current released version is 1.2.2, and Scala compiler plugins must be cross-built with `cross CrossVersion.full` (since they target a specific full Scala compiler version). Updated to `addCompilerPlugin("ch.epfl.scala" %% "scalac-profiling" % "1.2.2" cross CrossVersion.full)` and added a note that scalac-profiling is Scala 2 only.

3. **`dependencyList` and `whatDependsOn` presented as if available out of the box.** sbt 1.4+ only auto-enables `MiniDependencyTreePlugin`, which provides `dependencyTree` for Compile and Test configurations. The richer commands (`dependencyList`, `whatDependsOn`, `dependencyBrowseTreeHTML`, etc.) require the full `DependencyTreePlugin`, which has to be enabled via `addDependencyTreePlugin` in `project/plugins.sbt`. Added an inline note clarifying this requirement.

4. **`IntegrationTest` / `Defaults.itSettings` deprecation not mentioned.** Because the post pins sbt 1.9.7 and uses `.configs(IntegrationTest)` with `Defaults.itSettings`, readers should be aware these were deprecated in sbt 1.9.0 (still functional throughout sbt 1.x, but new builds should prefer a dedicated subproject). Added a short deprecation note before the snippet so the code remains valid while the deprecation is visible.

## Review Notes
- The `ThisBuild / Global / concurrentRestrictions` scope is unusual but not wrong: `Global / concurrentRestrictions` alone is the more typical form, since `concurrentRestrictions` is a global setting. Left as-is because it still resolves correctly.
- The post mixes the older colon-separated configuration axis syntax (`universal:packageBin`, `docker:publishLocal`) with the slash syntax (`Compile / scalacOptions`). Both still work in sbt 1.x. The slash form is the recommended modern style.
- All other version pins were verified against Maven Central / Scaladex (`scalatest 3.2.17`, `scalatestplus mockito-4-11 3.2.17.0`, `cats-core 2.10.0`, `cats-effect 3.5.2`, `circe 0.14.6`, `http4s 0.23.24`, `guava 32.1.3-jre`, `sbt-scalafmt 2.5.2`, `sbt-native-packager 1.9.16`, `sbt-assembly 2.1.5`, `sbt-release 1.1.0`, `sbt-updates 0.6.4`, `sbt-scoverage 2.0.9`, `sbt-site 1.5.0`, `kind-projector 0.13.2`, `testcontainers-scala-scalatest 0.41.0`).
- `turbo`, `usePipelining`, `useCoursier`, `useSuperShell`, `autoStartServer`, `evictionErrorLevel`, and `concurrentRestrictions` are all valid sbt 1.x settings and are used correctly.
- The `Process` / `IO.write` / `Fork.java` / `ForkOptions` APIs in the Custom Tasks section are valid sbt-internal APIs.
- The `assembly / assemblyMergeStrategy`, `assembly / assemblyExcludedJars`, and `assembly / assemblyJarName` settings are valid for sbt-assembly 2.x.
