declare module "qrcode" {
  export function toDataURL(
    text: string,
    options?: {
      margin?: number;
      width?: number;
      errorCorrectionLevel?: "L" | "M" | "Q" | "H";
      color?: { dark?: string; light?: string };
    },
  ): Promise<string>;
  export function create(
    text: string,
    options?: { errorCorrectionLevel?: "L" | "M" | "Q" | "H" },
  ): { modules: { size: number; get(row: number, col: number): number } };
}
