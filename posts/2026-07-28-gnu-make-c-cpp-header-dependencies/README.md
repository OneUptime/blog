# How to Generate C and C++ Header Dependencies Automatically in GNU Make

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Make, C, C++, GCC, Build Automation

Description: Generate one Make-compatible dependency file per translation unit so header changes rebuild exactly the C and C++ objects that include them.

---

A C or C++ object depends on more than its source file. It also depends on every header included directly or transitively. Writing those prerequisites by hand is error-prone:

```make
build/main.o: src/main.c include/app.h include/config.h
```

The compiler already discovers the real include graph while preprocessing. GCC and compatible compilers can emit that graph in Make syntax as a side effect of compilation.

## Use One `.d` File Per Object

Here is a complete small Makefile:

```make
CC := cc
CPPFLAGS := -Iinclude
CFLAGS := -O2 -Wall -Wextra
LDFLAGS :=
LDLIBS :=

SOURCES := $(wildcard src/*.c)
OBJECTS := $(patsubst src/%.c,build/%.o,$(SOURCES))
DEPFILES := $(OBJECTS:.o=.d)

.PHONY: all clean

all: app

app: $(OBJECTS)
	$(CC) $(LDFLAGS) $^ $(LDLIBS) -o $@

build/%.o: src/%.c
	@mkdir -p $(@D)
	$(CC) $(CPPFLAGS) $(CFLAGS) \
	  -MMD -MP -MF $(@:.o=.d) -MT $@ \
	  -c $< -o $@

-include $(DEPFILES)

clean:
	rm -rf build app
```

For a translation unit that includes `include/app.h`, the compiler writes a dependency file resembling:

```make
build/main.o: src/main.c include/app.h include/config.h

include/app.h:
include/config.h:
```

GNU Make reads these generated rules on future invocations. Editing `include/config.h` now marks only the objects whose `.d` files mention it as out of date.

## Understand Each Compiler Option

### `-MMD`

Generate dependencies on user headers while compiling. Unlike `-M`, it does not imply preprocess-only mode, so the object and dependency file are produced in one compiler invocation. `-MMD` omits headers found in system header directories.

Use `-MD` instead when system headers should appear too. Tracking them can be useful for some toolchain layouts, but system upgrades may then rebuild much of the project.

Whether a header uses angle brackets or quotes does not alone determine whether `-MMD` includes it; the compiler's system-header search classification does.

### `-MP`

Emit an empty target for each header. If a header is deleted or renamed, an old dependency file would otherwise make Make stop with "No rule to make target." The phony-like empty rule lets the compiler rerun and produce the current dependency graph.

`-MP` does not make a missing still-included header compile successfully. The compiler will report the real error.

### `-MF file`

Choose the dependency output path. Here:

```make
-MF $(@:.o=.d)
```

turns `build/main.o` into `build/main.d`.

### `-MT target`

Set the target written on the left side of the generated rule. This matters because the compiler's default may omit the `build/` directory. `-MT $@` ensures the dependency rule names the actual object.

`-MQ` is similar but quotes characters special to Make. Use it when target paths may contain Make metacharacters.

## Include Missing Files Without Failing

The first clean build has no `.d` files. Use:

```make
-include $(DEPFILES)
```

The leading `-` tells Make not to fail because an included makefile is absent. After compilation creates the files, subsequent runs load them.

Place the include after the intended default goal. The GNU Make manual notes that included dependency files contain target definitions; putting includes first can accidentally make an object the default goal.

Do not commit `.d` files. They contain build-tree paths and describe one compiler invocation. Generate them beside objects and remove both with `clean`.

## Keep Flags Consistent

The dependency scan must use the same preprocessing context as compilation:

- `CPPFLAGS` such as `-I`, `-isystem`, `-D`, and `-include`;
- language mode and target;
- generated-header include paths;
- feature macros.

Generating dependencies in a separate command with different flags can miss conditional includes. Producing `.o` and `.d` together avoids that drift.

The `.d` file records header prerequisites, but Make also needs to rebuild when command-line flags change. Traditional Make does not automatically compare recipe command lines. Common solutions include:

- clean rebuild when configuration changes;
- configuration-specific output directories;
- a generated flags stamp that objects depend on;
- a higher-level build generator that models command changes.

Do not pretend header dependency files solve compiler-flag invalidation.

## Model Generated Headers Explicitly

Compiler-generated dependencies have a bootstrap limitation: the compiler cannot list a generated header until that header exists and preprocessing reaches it.

Declare the generation rule:

```make
include/version.h: VERSION scripts/write-version
	@mkdir -p $(@D)
	./scripts/write-version VERSION $@

build/main.o: include/version.h
```

If many objects require generated headers, connect them through normal or order-only prerequisites according to semantics. A generated header that affects object contents is a normal prerequisite, not merely order-only.

Generate atomically when possible: write a temporary file, then replace the target only after success. Avoid updating the header timestamp when content is unchanged, because needless timestamp changes trigger rebuilds.

## Handle C++ and Nested Source Trees

For C++, use `CXX`, `CXXFLAGS`, and a suitable pattern:

```make
build/%.o: src/%.cpp
	@mkdir -p $(@D)
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) \
	  -MMD -MP -MF $(@:.o=.d) -MT $@ \
	  -c $< -o $@
```

For nested directories, the same pattern works if object paths mirror source paths and directory creation uses `$(@D)`.

Avoid deriving object names from basenames alone:

```text
src/client/log.c
src/server/log.c
```

Both would collide as `build/log.o`. Preserve the relative directory in the object path.

## Diagnose Missing Rebuilds

If changing a header does not rebuild an object:

1. open the corresponding `.d` file and check for the header;
2. verify the object rule uses `-MMD` or `-MD`;
3. confirm `-include` expands to the real dependency path;
4. check that preprocessing flags match compilation;
5. remove the object and `.d`, compile once, and inspect again;
6. check whether the source includes a generated or copied header from a different path.

Useful commands:

```bash
make --debug=v build/main.o
cc -MMD -MP -MF /tmp/main.d -MT build/main.o \
  -Iinclude -c src/main.c -o /tmp/main.o
cat /tmp/main.d
```

If an object rebuilds unnecessarily, inspect whether a generated header's timestamp changes on every Make invocation or a phony prerequisite was attached as a normal prerequisite.

## Avoid the Old `make depend` Workflow

Older projects often have a separate target that scans every source file and rewrites one dependency block. GNU Make's manual describes automatic remaking of included makefiles and recommends one dependency makefile per source. Modern GCC options make it simpler to generate the dependency at compilation time.

The result is incremental and parallel-safe: each compile owns its object and `.d` file, and Make has the actual transitive header graph rather than a hand-maintained approximation.

## Official Documentation

- [GNU Make automatic prerequisites](https://www.gnu.org/software/make/manual/html_node/Automatic-Prerequisites.html)
- [GNU Make including other makefiles](https://www.gnu.org/software/make/manual/html_node/Include.html)
- [GCC preprocessor options](https://gcc.gnu.org/onlinedocs/gcc/Preprocessor-Options.html)
- [GNU Make pattern rules](https://www.gnu.org/software/make/manual/html_node/Pattern-Rules.html)
- [GNU Make automatic variables](https://www.gnu.org/software/make/manual/html_node/Automatic-Variables.html)
