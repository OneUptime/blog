# Validation Summary: How to Create GC Tuning Best Practices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- JVM garbage collection
- G1GC
- ZGC and Generational ZGC
- Shenandoah GC
- JVM heap sizing and container memory flags
- Unified JVM logging
- `jcmd` JVM diagnostics

## Sources Consulted
- Oracle Java SE 21 `java` command documentation: https://docs.oracle.com/en/java/javase/21/docs/specs/man/java.html
- Oracle Java SE 21 G1 GC tuning guide: https://docs.oracle.com/en/java/javase/21/gctuning/garbage-first-g1-garbage-collector1.html
- Oracle Java SE 25 ZGC tuning guide: https://docs.oracle.com/en/java/javase/25/gctuning/z-garbage-collector.html
- OpenJDK JEP 439, Generational ZGC: https://openjdk.org/jeps/439
- OpenJDK JEP 474, ZGC Generational Mode by Default: https://openjdk.org/jeps/474
- OpenJDK JEP 490, ZGC Remove the Non-Generational Mode: https://openjdk.org/jeps/490
- OpenJDK Shenandoah GC wiki: https://wiki.openjdk.org/spaces/shenandoah/pages/25002018/Main
- Red Hat OpenJDK 21 Shenandoah GC documentation: https://docs.redhat.com/en/documentation/red_hat_build_of_openjdk/21/html-single/using_shenandoah_garbage_collector_with_red_hat_build_of_openjdk_21/index
- OpenJDK JDK 25 G1 flag source: https://raw.githubusercontent.com/openjdk/jdk/jdk-25+36/src/hotspot/share/gc/g1/g1_globals.hpp
- OpenJDK JDK 25 ZGC flag source: https://raw.githubusercontent.com/openjdk/jdk/jdk-25+36/src/hotspot/share/gc/z/z_globals.hpp
- OpenJDK JDK 25 Shenandoah flag source: https://raw.githubusercontent.com/openjdk/jdk/jdk-25+36/src/hotspot/share/gc/shenandoah/shenandoah_globals.hpp

## Issues Found
- The post described Shenandoah as always providing sub-millisecond pauses. I changed this to "low pauses" and "very low pause times" because OpenJDK documents typical Shenandoah pauses as workload-dependent, commonly low but not guaranteed sub-millisecond.
- The ZGC examples used `-XX:+ZGenerational` as a current JDK 21+ flag. I removed it from current examples and clarified that it applies to JDK 21-23; JDK 24 and later use generational ZGC by default and remove the option.
- The ZGC tuning table listed `ZFragmentationLimit` as 25%. I corrected the current JDK 25 default to 5%.
- The Shenandoah production example used `-XX:+ShenandoahAllocFailureALot`, a diagnostic testing flag that simulates allocation failures. I replaced it with `-XX:+AlwaysPreTouch`, which Shenandoah documentation recommends for reducing latency hiccups when using fixed heap sizing.
- The container tuning table said `MinRAMPercentage` prevents heap shrinking under memory pressure. I corrected it to explain that it controls maximum heap percentage for very small heaps, not the minimum heap size.
- The common mistakes table treated `Xms != Xmx` as categorically wrong. I softened this to distinguish latency-sensitive fixed heaps from footprint-sensitive workloads where a lower `Xms` can be intentional.
- The `jcmd GC.heap_info` comment said it forces GC. I corrected it to say it prints heap statistics.

## Review Notes
- The post is now technically valid for modern HotSpot/OpenJDK usage, with explicit version caveats for ZGC generational mode.
- Some tuning recommendations remain intentionally heuristic. Exact values should still be validated under workload-specific GC logs and latency measurements.
