# langium-tools showcases

Working languages that show how to use [langium-tools](https://github.com/borisbrodski/langium-tools) with [Langium](https://langium.org).

Each directory is one showcase. The projects do not share a `package.json` or a build. Add the next language as another directory. Point it at the same sibling checkout of langium-tools.

| Showcase | What it is |
| --- | --- |
| [statemachine](statemachine/) | The official Langium state-machine example. Same grammar, same C++ program, plus the langium-tools issue API, generator, Java import manager, and tests. |

`upstream` is that official example, copied unchanged from [eclipse-langium/langium](https://github.com/eclipse-langium/langium) `examples/statemachine`. `main` extends it. The diff is the lesson:

```sh
git diff upstream -- statemachine
```

## Layout

Clone this repository next to langium-tools. The statemachine package depends on `file:../../langium-tools`, and langium-tools exports `dist/`, so build the library first.

```
langium-tools/
langium-tools-showcases/
  statemachine/
```

```sh
git clone https://github.com/borisbrodski/langium-tools.git
git clone https://github.com/borisbrodski/langium-tools-showcases.git
cd langium-tools && npm install && npm run build
cd ../langium-tools-showcases/statemachine
npm install
npm test
```

Node must be `^22.22.2`, `^24.15.0`, or `>=26`.

The statemachine README is the walkthrough: which call replaces which hand-written loop, and which library features this language does not need.
