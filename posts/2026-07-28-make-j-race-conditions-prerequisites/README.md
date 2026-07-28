# Why Does `make -j` Produce Race Conditions? Fixing Missing and Order-Only Prerequisites

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Make, Parallel Builds, Build Automation, C, C++

Description: Fix GNU Make parallel-build races by declaring complete data dependencies, using order-only prerequisites correctly, and isolating shared recipe outputs.

---

`make -j` rarely creates a dependency bug. It reveals one that a serial execution order happened to hide.

GNU Make may run any two ready targets concurrently. If target B requires a file or side effect from target A, the makefile must declare that relationship. The textual order of rules is not a scheduling guarantee.

## Start from the Failing File

Suppose this works with `make` but intermittently fails with `make -j8`:

```make
all: generate compile

generate:
	./generate-config > include/config.h

compile:
	$(CC) -Iinclude -c src/main.c -o build/main.o
```

Both prerequisites of `all` are ready at the same time. `compile` may start before `generate`.

Model the file, not a vague phase:

```make
all: build/main.o

include/config.h: config/schema.json scripts/generate-config
	@mkdir -p $(@D)
	./scripts/generate-config config/schema.json > $@.tmp
	mv $@.tmp $@

build/main.o: src/main.c include/config.h
	@mkdir -p $(@D)
	$(CC) -Iinclude -c $< -o $@
```

Now the graph says exactly why compilation must wait and when regeneration is needed.

## Normal Prerequisites Carry Two Meanings

In:

```make
target: prerequisite
```

the prerequisite means:

1. build it before `target`;
2. if it is newer than `target`, rebuild `target`.

That is correct for source files, headers, schemas, generators, and libraries whose content affects the target.

If a generated header changes, the object must recompile. Making the header order-only would enforce first-run order but fail to rebuild an existing object after the header changed.

## Order-Only Prerequisites Carry Only Ordering

GNU Make separates order-only prerequisites after `|`:

```make
build/main.o: src/main.c include/config.h | build
	$(CC) -Iinclude -c $< -o $@

build:
	mkdir -p $@
```

The `build` directory must exist before compilation, but its timestamp should not make every object out of date whenever another file is added. That is the ideal order-only use.

A directory pattern for nested outputs can be:

```make
build/%.o: src/%.c | build
	$(CC) -c $< -o $@
```

If each target needs a different nested directory, creating `$(@D)` inside the recipe is often simpler and safe because `mkdir -p` is idempotent.

Use order-only prerequisites for sequencing conditions that do not affect target freshness. Do not use them to suppress legitimate rebuilds.

## Declare Header Dependencies

Hand-written object rules often list only `.c` or `.cpp` files:

```make
build/main.o: src/main.c
```

Then a header may be generated in parallel or edited without rebuilding the object. Use compiler-generated `.d` files with GCC-compatible `-MMD -MP` options so every direct and transitive user header becomes a normal prerequisite.

Generated headers still need explicit production rules. The compiler cannot discover a header that does not yet exist on the first build.

## Give Each Recipe Exclusive Outputs

Even with correct ordering, two recipes must not write the same path concurrently:

```make
test-a:
	./test-a > test-results/results.xml

test-b:
	./test-b > test-results/results.xml
```

Give each target a unique output:

```make
test-a: test-results/a.xml
test-b: test-results/b.xml

test-results/a.xml:
	@mkdir -p $(@D)
	./test-a > $@.tmp
	mv $@.tmp $@

test-results/b.xml:
	@mkdir -p $(@D)
	./test-b > $@.tmp
	mv $@.tmp $@
```

Merge them in a dependent target after both finish. The same rule applies to generated archives, temporary filenames, coverage databases, code-generation directories, and package-manager state.

Use per-target temporary files and atomic replacement where the filesystem supports it. A failed recipe should not leave a plausible partial target. GNU Make's `.DELETE_ON_ERROR` special target can remove a target whose recipe failed after changing it:

```make
.DELETE_ON_ERROR:
```

That is a safeguard, not a substitute for transactional generation.

## Do Not Use Phony Targets as Data Files

This is always considered out of date:

```make
.PHONY: generated
generated:
	./generator

build/main.o: generated
```

It may rebuild `main.o` every time and still hide which file the compiler consumes. Give generated outputs their real filenames and prerequisites. Reserve phony targets for user-facing goals such as `all`, `clean`, and `test`.

## Model Multi-Output Generators Carefully

One generator may create `parser.c` and `parser.h`. Two independent recipes invoking the generator can race. Current GNU Make supports grouped targets with `&:`, which state that one recipe invocation updates every listed target:

```make
generated/parser.c generated/parser.h &: grammar/parser.y
	@mkdir -p generated
	./scripts/generate-parser $< generated

build/parser.o: generated/parser.c generated/parser.h
```

Do not replace `&:` with an ordinary independent-target rule containing the same recipe; Make may invoke that recipe separately for each missing output. For older Make versions, a stamp-file design can coordinate the generator, but it must also detect an individually deleted output rather than trusting a surviving stamp.

## Investigate Recursive Make and the Jobserver

Recursive builds should invoke `$(MAKE)`, not a literal `make`:

```make
subsystem:
	$(MAKE) -C subsystem
```

GNU Make recognizes recursive `$(MAKE)` recipes and shares jobserver tokens so nested builds respect overall parallelism. Wrappers that swallow jobserver flags can oversubscribe the machine or serialize unexpectedly.

Recursive directory ordering can also hide missing cross-directory dependencies. A top-level "build directories in this order" sequence is less precise than expressing the library or generated file that a downstream target actually needs.

## Use Serialization Only as a Diagnostic or Narrow Constraint

`.NOTPARALLEL` can serialize an entire invocation or selected prerequisite sets. `.WAIT` can create a barrier inside a prerequisite list in current GNU Make.

They are useful when an external tool truly cannot run concurrently and no finer resource lock exists. They are poor default fixes for a missing file edge: they discard parallelism and leave the graph semantically incomplete.

Start by identifying the exact shared resource. Serialize only its owning targets.

## Shake Out Hidden Ordering

GNU Make's `--shuffle` option reorders goals and prerequisites while preserving declared target/prerequisite relationships. Repeated shuffled parallel builds help expose dependencies that happen to match file or declaration order:

```bash
make clean
make --shuffle=random -j8 all
```

Also test:

- a completely clean tree;
- an incremental build after changing one header;
- deletion of one generated output;
- two independent top-level goals together;
- high parallelism on a slower machine;
- repeated builds with different shuffle seeds.

Keep the failing shuffle seed reported by Make so the schedule can be reproduced.

## Read the Graph

Useful diagnostics include:

```bash
make --debug=v target
make -n target
make -pRrq : 2>/dev/null
```

Look for:

- a consumed file absent from the prerequisite list;
- a normal prerequisite incorrectly moved after `|`;
- two recipes owning one output;
- output directories used as normal prerequisites;
- a phony prerequisite forcing unnecessary work;
- a shell background process that outlives its recipe;
- a recipe that returns before its file is fully written.

The durable objective is not "make the race disappear." It is a graph in which any schedule allowed by GNU Make produces the same complete outputs.

## Official Documentation

- [GNU Make parallel execution](https://www.gnu.org/software/make/manual/html_node/Parallel.html)
- [GNU Make disabling parallel execution](https://www.gnu.org/software/make/manual/html_node/Parallel-Disable.html)
- [GNU Make order-only prerequisites](https://www.gnu.org/software/make/manual/html_node/Prerequisite-Types.html)
- [GNU Make shuffle mode](https://www.gnu.org/software/make/manual/html_node/Options-Summary.html)
- [GNU Make recursive use](https://www.gnu.org/software/make/manual/html_node/MAKE-Variable.html)
- [GNU Make rules with independent and grouped targets](https://www.gnu.org/software/make/manual/html_node/Multiple-Targets.html)
- [GNU Make errors in recipes](https://www.gnu.org/software/make/manual/html_node/Errors.html)
- [GCC preprocessor dependency options](https://gcc.gnu.org/onlinedocs/gcc/Preprocessor-Options.html)
