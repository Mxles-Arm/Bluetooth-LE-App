// Design tokens — "Felt & Stamp": roulette-table green, brass gold, red-pen red, hard ink outlines.
// Palette base: "Card & Board Game" (felt green + gold) from the project's color database,
// style: Neubrutalism (mobile) — thick borders, flat fills, hard offset shadows.
export type ThemeName = 'light' | 'dark';

export type Theme = {
  name: ThemeName;
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  line: string;        // borders + hard shadow
  felt: string;        // roulette-table panel
  onFelt: string;
  gold: string;        // primary action
  onGold: string;
  red: string;         // roulette pockets / red pen
  redText: string;     // red used as text on surface
  success: string;
  onSuccess: string;
  ink: string;
};

export const themes: Record<ThemeName, Theme> = {
  light: {
    name: 'light',
    bg: '#E4ECE5',
    surface: '#FFFFFF',
    surfaceAlt: '#EFF4EF',
    text: '#0B0F0C',
    textSecondary: '#44524A',
    line: '#0B0F0C',
    felt: '#0F6B3A',
    onFelt: '#F6F3E4',
    gold: '#F2B01E',
    onGold: '#0B0F0C',
    red: '#D62828',
    redText: '#B3201F',
    success: '#0F6B3A',
    onSuccess: '#FFFFFF',
    ink: '#0B0F0C',
  },
  dark: {
    name: 'dark',
    bg: '#07140E',
    surface: '#10241A',
    surfaceAlt: '#18301F',
    text: '#F3F0DE',
    textSecondary: '#A9B9AE',
    line: '#E9E5D0',
    felt: '#0D4D2B',
    onFelt: '#F6F3E4',
    gold: '#F2B01E',
    onGold: '#0B0F0C',
    red: '#D62828',
    redText: '#FF8A7D',
    success: '#5FD39A',
    onSuccess: '#0B0F0C',
    ink: '#0B0F0C',
  },
};

// 8pt spacing rhythm
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };
export const BORDER = 3;   // outline thickness
export const SHADOW = 5;   // hard shadow offset
