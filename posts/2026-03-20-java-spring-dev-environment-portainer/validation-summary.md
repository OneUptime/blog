# Validation Summary: How to Set Up a Java/Spring Boot Development Environment with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Java
- Spring Boot
- Spring Boot DevTools
- Maven
- Gradle
- H2 Database
- VS Code Java Debugger
- IntelliJ IDEA remote JVM debugging

## Sources Consulted
- Spring Boot Developer Tools: https://docs.spring.io/spring-boot/reference/using/devtools.html
- Spring Boot Maven Plugin, Running your Application with Maven: https://docs.spring.io/spring-boot/maven-plugin/run.html
- Spring Boot Gradle Plugin, Running your Application with Gradle: https://docs.spring.io/spring-boot/gradle-plugin/running.html
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer Docs, Add a new stack: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer Docs, How Relative Path Support works in Portainer: https://docs.portainer.io/sts/advanced/relative-paths
- VS Code Docs, Running and debugging Java: https://code.visualstudio.com/docs/java/java-debugging
- IntelliJ IDEA Docs, Tutorial: Remote debug: https://www.jetbrains.com/help/idea/tutorial-remote-debug.html
- Alpine Linux package index, Maven package: https://pkgs.alpinelinux.org/package/v3.22/community/x86/maven
- Alpine Linux package index, Gradle package: https://pkgs.alpinelinux.org/package/v3.22/community/armv7/gradle

## Issues Found
- The Compose example used `./myapp:/app`, which is misleading for Portainer deployments. Portainer only supports relative path volumes in a specific Git-based Business Edition workflow, so I changed the example to `/path/to/myapp:/app` and updated the comment to call out the Portainer requirement.
- The Compose example declared `version: "3.8"`. Current Docker Compose documentation marks the top-level `version` field as obsolete, so I removed it.
- The post described Spring DevTools as “hot-reload”, but official Spring Boot documentation is explicit that modified files must be recompiled so the classpath changes before DevTools can restart the app. I updated the description, introductory paragraph, dependency comment, and properties comment to reflect restart-based behavior accurately.
- The Compose example set `JAVA_OPTS`, but the shown `mvn spring-boot:run` command does not consume that variable. The example already used the supported `spring-boot.run.jvmArguments` flag for JDWP, so I removed the unused `JAVA_OPTS` block.
- The Compose comment said the container was using the Maven wrapper even though the command installed Maven and ran `mvn`. I corrected the comment to match the command that is actually shown.

## Review Notes
- The Gradle alternative is syntactically correct, but DevTools restarts still depend on recompilation there as well; `bootRun` alone does not make Java source edits reload without rebuilding classes.
- Portainer-specific path handling is the main caveat in this post. Relative bind mounts can work when deploying from Git with Portainer Business Edition and relative path volumes enabled, but they should not be presented as the general Portainer case.
