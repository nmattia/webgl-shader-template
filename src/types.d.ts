// Necessary type declarations so that TypeScript knows what
// we mean by 'import foo from "./path?raw"' (used to read the
// shader sources)
declare module "*?raw" {
  const content: string;
  export default content;
}
