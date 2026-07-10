import { SignJWT, jwtVerify, type JWTPayload } from "jose";

// En production : variable d'environnement JWT_SECRET dans .env.local
const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "sangocare-secret-dev-key-2026-changeme"
);

export const COOKIE_NAME = "sangocare_token";
export const TOKEN_EXPIRY = "24h";

export interface AuthPayload extends JWTPayload {
  phone: string;
  name: string;
  role: "patient" | "personnel";
}

/** Signe un JWT et le retourne sous forme de string */
export async function signToken(payload: Omit<AuthPayload, keyof JWTPayload>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(SECRET_KEY);
}

/** Vérifie un JWT et retourne le payload, ou null si invalide */
export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as AuthPayload;
  } catch {
    return null;
  }
}
