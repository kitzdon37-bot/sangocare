import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

// Routes qui nécessitent un rôle spécifique
const ROLE_ROUTES: Record<string, "personnel"> = {
  "/clinique": "personnel",
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Ignorer les routes API, _next, fichiers statiques
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Routes publiques : site et page de connexion
  if (pathname === "/" || pathname === "/connexion") return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;

  // Non connecté → redirection login
  if (!token) {
    return NextResponse.redirect(new URL("/connexion", req.url));
  }

  const payload = await verifyToken(token);

  // Token invalide ou expiré → redirection login + suppression cookie
  if (!payload) {
    const res = NextResponse.redirect(new URL("/connexion", req.url));
    res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
    return res;
  }

  // Vérification du rôle pour les routes protégées
  const requiredRole = ROLE_ROUTES[pathname];
  if (requiredRole && payload.role !== requiredRole) {
    // Mauvais rôle (ex: patient tente /clinique) → retour accueil
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
