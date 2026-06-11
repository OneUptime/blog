# Validation Summary: How to Build Heap Dump Analysis

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Java JVM heap dumps
- JDK diagnostic tools: `jmap`, `jcmd`, `jps`, JVM `-XX` options
- Eclipse Memory Analyzer Tool (MAT)
- VisualVM
- Java reference types: strong, soft, weak, and phantom references
- Bash automation for heap dump collection

## Sources Consulted
- Oracle JDK 21 `jmap` command documentation: https://docs.oracle.com/en/java/javase/21/docs/specs/man/jmap.html
- Oracle JDK 21 `jcmd` command documentation: https://docs.oracle.com/en/java/javase/21/docs/specs/man/jcmd.html
- Oracle JDK 21 `java` command documentation for `HeapDumpOnOutOfMemoryError`, `HeapDumpPath`, and `OnOutOfMemoryError`: https://docs.oracle.com/en/java/javase/21/docs/specs/man/java.html
- Eclipse MAT official site: https://eclipse.dev/mat/
- Eclipse MAT OQL syntax and BNF documentation: https://help.eclipse.org/latest/topic/org.eclipse.mat.ui.help/reference/oqlsyntax.html
- Eclipse MAT property accessors documentation: https://help.eclipse.org/latest/topic/org.eclipse.mat.ui.help/reference/propertyaccessors.html
- Eclipse MAT batch mode documentation: https://help.eclipse.org/latest/topic/org.eclipse.mat.ui.help/tasks/batch.html
- Eclipse MAT `SnapshotQuery` API documentation: https://help.eclipse.org/latest/ntopic/org.eclipse.mat.ui.help/doc/org/eclipse/mat/snapshot/query/SnapshotQuery.html
- VisualVM documentation and command-line options: https://visualvm.github.io/documentation.html and https://visualvm.github.io/docs/command-line-options.html
- VisualVM OQL documentation: https://www.devdoc.net/javaxe/visualvm-1.3.7/oqlhelp.html
- Oracle Java SE 21 `SoftReference`, `WeakReference`, and `PhantomReference` API documentation: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/ref/package-summary.html

## Issues Found
- The MAT OQL duplicate-string example used SQL `GROUP BY` and `HAVING`, which are not part of MAT's documented OQL grammar. Replaced it with a valid OQL query that finds strings with large backing arrays.
- The VisualVM startup section said VisualVM is bundled with the JDK. That is only true for older JDK distributions, so the note now distinguishes older bundled installs from current standalone VisualVM.
- The VisualVM OQL thread-state example used an implementation-specific `threadStatus == 1` check. Replaced it with a documented-style query that displays thread names and thread objects.
- The reference-type table oversimplified soft, weak, and phantom reference behavior. Updated the wording to match the Java SE reference API descriptions.
- The heap dump collection script compared `df` output with a `jcmd GC.heap_info` value that could include a `K` suffix and was not reliably parsed. Updated the script to quote paths, create the dump directory, parse heap size in KB, and avoid integer comparison errors.
- The MAT API example imported `org.eclipse.mat.parser.internal.SnapshotFactory`, directly used `LeakHunterQuery`, and calculated retained heap for class objects rather than class instances. Updated it to use the public `org.eclipse.mat.snapshot.SnapshotFactory` import, `IClass#getRetainedHeapSizeOfObjects`, and the documented `SnapshotQuery` API example for top consumers.

## Review Notes
The commands and concepts are generally accurate for modern HotSpot/OpenJDK JVMs. Some heap dump and MAT behavior can vary by JVM vendor and MAT version, especially for very large dumps and non-HPROF dump formats.
