## Lab 9: Dead Code Detector

> **Prerequisites:** Complete `00-lab-setup.md` before starting this use case (workspace scan required)
> **Code Set:** Any COBOL workspace — recommended code: `Sample Code`
> **Mode:** Z Architect
> **Duration:** 20–30 minutes
> **Difficulty:** Beginner–Intermediate

---

### Overview

Every long-lived mainframe application accumulates dead code — paragraphs that were once called but whose callers were removed, programs that were never integrated, SQL tables that were declared but whose access statements were later deleted. This dead code increases maintenance costs, confuses developers, and adds risk to every change.

In this use case you will use `execute_sql_query` to interrogate the local metadata database Bob built during setup. Three targeted SQL queries expose dead code across three dimensions — paragraphs, programs, and SQL tables — and then a single prompt asks Bob to synthesise the findings into a prioritised removal backlog you can act on immediately.

---

### Learning Objectives

By the end of this use case, you will be able to:

- Write SQL queries against Bob's metadata schema to find paragraphs never PERFORMed by any program
- Identify programs in the workspace that no other program ever CALLs
- Detect SQL tables that are declared in a program but never accessed during execution (`ParaID != 0`)
- Interpret query results in the context of the GenApp insurance application
- Prompt Bob to synthesise raw SQL results into a prioritised dead code removal backlog

---

### Background: How Bob's Metadata Schema Enables This Analysis

When you scanned the workspace in the lab setup, Bob built a local SQLite database containing a relational model of your entire application. The key tables for dead code detection are:

| Table | What It Holds |
|---|---|
| `Programs` | Every program in the workspace |
| `Paragraphs` | Every paragraph (section) defined across all programs |
| `StatementReference` | Every reference one statement makes to a resource (program, paragraph, SQL table, variable, file, …) |
| `OccurrencesStmt` | Every executable statement, linked to the program and paragraph it lives in |
| `SQLTables` | Every DB2/SQL table the application references |

`StatementReference.ResourceType` tells you what kind of resource is being referenced:

| ResourceType | Meaning |
|---|---|
| `2` | Paragraph — a PERFORM or GO TO target |
| `5` | Program — a CALL target |
| `1` | SQL table — a table touched by an embedded SQL statement |

`OccurrencesStmt.ParaID != 0` means the statement is inside a paragraph (i.e., it executes at runtime). `ParaID = 0` means it is in the Data Division or a DECLARE — not executable.

---

### Actions

### Before You Start

Ensure you are in **Z Architect** mode and that the workspace scan from `00-lab-setup.md` has completed. Bob must have a local metadata database before any of the queries below will return results.

> ⚠️ **Mode matters.** `execute_sql_query` is only available in Z Architect mode. If you do not see results, confirm you are in the correct mode.

---

### Exercise 1 — Find Paragraphs Never PERFORMed

Paragraphs that exist in source code but are never the target of a `PERFORM` or `GO TO` statement anywhere in the application are dead by definition — no execution path can reach them.

**How the query works:**
- The left side (`Paragraphs`) lists every paragraph defined in the workspace.
- The right side is a sub-query that collects every `ParaID` that appears as a `ResourceID` in `StatementReference` with `ResourceType = 2` (paragraph reference) and where the calling statement is itself inside a paragraph (`OccurrencesStmt.ParaID != 0`).
- `LEFT JOIN … WHERE sr.ResourceID IS NULL` returns only the paragraphs for which no such reference exists.

**ACTION:** Ensure you are in **Z Architect** mode. Paste the following prompt into the chat window:

```
Run this SQL query against the local metadata database and show me the results:

SELECT
    p.ParaName,
    prog.ProgramName,
    o.StartRow
FROM Paragraphs p
JOIN Programs prog ON p.ProgramID = prog.ProgramID
JOIN Occurrences o  ON p.OccurID  = o.OccurID
LEFT JOIN (
    SELECT DISTINCT sr.ResourceID
    FROM   StatementReference sr
    JOIN   OccurrencesStmt    os ON sr.OccurID = os.OccurID
    WHERE  sr.ResourceType = 2
    AND    os.ParaID != 0
) AS called ON called.ResourceID = p.ParaID
WHERE called.ResourceID IS NULL
ORDER BY prog.ProgramName, o.StartRow;
```

**What to look for in the results:**

- Paragraphs with names that include `INIT`, `SETUP`, `OLD`, or version suffixes (e.g., `-V1`, `-OLD`) are strong candidates for removal — they are often left over from earlier iterations.
- Paragraphs containing only `CONTINUE` or `EXIT` with no logic are low-risk removals.
- A paragraph appearing at the very end of a program with no callers may be a development stub that was never wired up.

> **Tip:** Some paragraphs are intentionally unreachable — for example, an `ABEND-HANDLER` paragraph invoked only through a special CICS condition, not a PERFORM. Cross-reference with your team before deleting.

#### Expected Results

- ✅ A table of paragraph names, owning programs, and source line numbers
- ✅ Results scoped to the four programs in the Sample Code workspace (`LGACDB01`, `LGAPDB01`, `LGDPDB01`, `LGUPDB01`)

---

### Exercise 2 — Find Programs Never CALLed

A program that no other program ever calls is either an entry point (a transaction root, invoked by CICS or a job step — not by another program) or it is genuinely dead. This query separates them by identifying every program whose `ProgramID` never appears as a `ResourceID` in a `CALL`-type `StatementReference`.

**How the query works:**
- `ResourceType = 5` in `StatementReference` means a CALL to another program.
- `OccurrencesStmt.ParaID != 0` restricts to runtime CALLs (not declarations).
- The `LEFT JOIN … IS NULL` pattern returns programs that are never the target of any runtime CALL.

**ACTION:** Paste the following prompt into the chat window:

```
Run this SQL query against the local metadata database and show me the results:

SELECT
    prog.ProgramName,
    prog.ProgramID,
    prog.ProgramTypeID
FROM Programs prog
LEFT JOIN (
    SELECT DISTINCT sr.ResourceID
    FROM   StatementReference sr
    JOIN   OccurrencesStmt    os ON sr.OccurID = os.OccurID
    WHERE  sr.ResourceType = 5
    AND    os.ParaID != 0
) AS called ON called.ResourceID = prog.ProgramID
WHERE called.ResourceID IS NULL
ORDER BY prog.ProgramName;
```

**What to look for in the results:**

- `ProgramTypeID = 1` is a standard COBOL program. If it never appears as a CALL target it is either a transaction root or dead.
- Cross-reference against the CICS CSD (`GENAPP.CSD` in the Sample Code) — any program listed there as a transaction entry point is a legitimate root, not dead code.
- Programs that appear in the workspace but are not in the CSD and are never called are the highest-confidence dead code candidates.

> **Tip:** In the GenApp sample application, programs like `LGACDB01` and `LGAPDB01` are called by other programs in the full application set, but may appear here as uncalled because only four of the ~30 GenApp programs are included in the Sample Code folder. Always consider what is in scope before acting on these results.

#### Expected Results

- ✅ A list of program names with their type IDs
- ✅ Each entry is a candidate for further investigation or removal

---

### Exercise 3 — Find SQL Tables Declared but Never Accessed at Runtime

A SQL table that appears only in a `DECLARE TABLE` statement (Data Division, `ParaID = 0`) and never in any executable SQL statement (`ParaID != 0`) contributes no runtime value. This pattern commonly occurs after features are removed but the DECLARE is left behind.

**How the query works:**
- `ResourceType = 1` in `StatementReference` means a SQL table reference.
- The inner query collects every `SqlTableID` that is accessed by a statement inside a paragraph (`os.ParaID != 0`).
- The outer query returns tables that only appear in declarations (`ParaID = 0`) but never in executable statements.

**ACTION:** Paste the following prompt into the chat window:

```
Run this SQL query against the local metadata database and show me the results:

SELECT
    t.TableName,
    prog.ProgramName
FROM SQLTables t
JOIN StatementReference sr_decl ON sr_decl.ResourceID  = t.SqlTableID
                                AND sr_decl.ResourceType = 1
JOIN OccurrencesStmt    os_decl ON os_decl.OccurID      = sr_decl.OccurID
                                AND os_decl.ParaID        = 0
JOIN Programs           prog    ON os_decl.ProgID        = prog.ProgramID
LEFT JOIN (
    SELECT DISTINCT sr.ResourceID
    FROM   StatementReference sr
    JOIN   OccurrencesStmt    os ON sr.OccurID = os.OccurID
    WHERE  sr.ResourceType = 1
    AND    os.ParaID != 0
) AS runtime ON runtime.ResourceID = t.SqlTableID
WHERE runtime.ResourceID IS NULL
ORDER BY prog.ProgramName, t.TableName;
```

**What to look for in the results:**

- Any table appearing here has a DECLARE statement in the source but no SELECT, INSERT, UPDATE, or DELETE against it in executable code.
- These tables may be safe to remove from the copybook or Working-Storage section after confirming no dynamic SQL accesses them (rare in COBOL but worth noting).
- Cross-reference the table name against the DB2 catalogue if available — if the table itself no longer exists in the schema, removal is low-risk.

#### Expected Results

- ✅ A list of SQL table names paired with the program that declares them
- ✅ Confirmation that no program accesses those tables at runtime

---

### Exercise 4 — Generate a Prioritised Dead Code Removal Backlog

Now that you have raw results from three angles, ask Bob to synthesise them into an actionable backlog.

**ACTION:** Paste the following prompt into the chat window — Bob will read all three sets of results from the current conversation context:

```
Based on the three dead code queries we just ran — unreachable paragraphs, uncalled programs, and declared-but-never-accessed SQL tables — generate a prioritised dead code removal backlog for this application.

For each item in the backlog:
1. Identify what it is (paragraph / program / SQL table declaration)
2. Explain why it is likely dead
3. Assign a risk level (Low / Medium / High) based on how confident we can be it is truly unused
4. Suggest a verification step before removal
5. Estimate the removal effort (Small / Medium / Large)

Group the backlog into three priority tiers:
- Priority 1 — Remove with confidence (low risk, high certainty)
- Priority 2 — Investigate before removing (medium risk or uncertainty)
- Priority 3 — Monitor only (low certainty, complex dependencies)

Save the backlog as a markdown file.
```

> **Tip:** If auto-approvals are off, click **Approve** when Bob requests to write the file.

Bob will produce a structured backlog document saved to `.bobz/` (for example, `.bobz/dead-code-backlog.md`). Right-click the file in the explorer and select **Open Preview** to review it.

#### Expected Results

- ✅ Prioritised backlog document generated
- ✅ Items grouped into three tiers (Remove / Investigate / Monitor)
- ✅ Each item includes risk level, verification step, and removal effort
- ✅ Summary section with total count of dead code candidates found

---

### Key Takeaways

- **The metadata database is queryable SQL** — any question you can express as a join across `Programs`, `Paragraphs`, `StatementReference`, and `OccurrencesStmt` can be answered without opening a single source file.
- **`ParaID != 0` is the runtime filter** — always apply it when you want to know what code *executes*, not just what is declared.
- **`ResourceType` is the foreign-key selector** — `1` = SQL table, `2` = paragraph, `5` = program CALL. Knowing this lets you write targeted dead code queries for any resource type.
- **Dead code is a spectrum** — paragraphs that are truly unreachable differ from programs that are entry points. Always verify with the CSD and team knowledge before deleting.
- **Bob closes the loop** — raw SQL results are useful, but the real value comes from asking Bob to interpret them and produce an actionable plan.

---

### SQL Quick-Reference

Use these as starting points for your own dead code investigations:

| Goal | Key Filter |
|---|---|
| Paragraph never called | `ResourceType = 2`, `LEFT JOIN IS NULL` on `Paragraphs` |
| Program never called | `ResourceType = 5`, `LEFT JOIN IS NULL` on `Programs` |
| SQL table never accessed at runtime | `ResourceType = 1`, `ParaID != 0` for runtime, `ParaID = 0` for declarations |
| Variable never read | `ResourceType = 4`, `bRead != 0` for reads, `LEFT JOIN IS NULL` |
| File never opened at runtime | `ResourceType = 9`, `LEFT JOIN IS NULL` on `Files` with `ParaID != 0` |

---
