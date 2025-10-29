/** @type {import("tailwindcss").Config} */
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0B3B2E",
          dark: "#07251C",
          light: "#1C6B54",
          mint: "#CDE4DC",
          accent: "#0E7C86"
        },
        ink: {
          900: "#0D1321",
          700: "#1F2937",
          500: "#6B7280",
          300: "#D1D5DB",
          100: "#F3F4F6",
          50:  "#F9FAFB"
        }
      },
      borderRadius: { xl: "0.9rem", "2xl": "1.25rem" },
      boxShadow: { soft: "0 8px 24px rgba(0,0,0,0.08)" }
    }
  },
  plugins: [],
};
