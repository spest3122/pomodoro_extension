---
version: alpha
name: Inkwell-Cartoon-Design-Analysis
description: This design system delivers a classic 1920s/1930s rubber-hose animation aesthetic ("Inkwell Black & White"). The style is defined by heavy, hand-drawn black outlines ({colors.ink-deep}), an aged, yellowed film stock background ({colors.canvas-aged}), stark white primary accents ({colors.accent-white}), and solid, hard-edged ink drop shadows instead of modern blurs. The system rejects modern geometry in favor of playful, asymmetrical rounded corners and expressive, high-contrast display typography.

colors:
  # Core Inkwell Monochromatic Palette
  ink-deep: "#111111"       # Thick, rich fountain pen black for outlines and main text
  canvas-aged: "#e6dfcc"    # Aged, yellowed vintage film stock for page backgrounds
  accent-grey: "#cccccc"    # Mid-tone silver-grey for secondary fills and passive fields
  accent-white: "#ffffff"   # High-contrast stark white for active inputs and key buttons
  
  # Shadow & Border Token equivalents
  border-ink: "5px solid #111111"
  shadow-hard-card: "12px 12px 0px #111111"
  shadow-hard-btn: "0px 8px 0px #111111"
  shadow-hard-sm: "4px 4px 0px #111111"

typography:
  hero-display:
    fontFamily: Spicy Rice, cursive
    fontSize: 80px
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: 2px
    textTransform: uppercase
  display-lg:
    fontFamily: Spicy Rice, cursive
    fontSize: 56px
    fontWeight: 400
    lineHeight: 1.10
  heading-1:
    fontFamily: Fredoka One, cursive
    fontSize: 48px
    fontWeight: 400
    lineHeight: 1.15
  heading-2:
    fontFamily: Fredoka One, cursive
    fontSize: 36px
    fontWeight: 400
    lineHeight: 1.20
  body-md:
    fontFamily: Fredoka One, cursive
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  button-lg:
    fontFamily: Fredoka One, cursive
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.30
    textTransform: uppercase

rounded:
  sm: "6px"
  md: "12px"
  lg: "30px 15px 30px 15px" # Asymmetrical, hand-drawn look
  full: "50px"

spacing:
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  xxl: "40px"

components:
  button-primary:
    backgroundColor: "{colors.accent-white}"
    textColor: "{colors.ink-deep}"
    border: "{colors.border-ink}"
    boxShadow: "{colors.shadow-hard-btn}"
    typography: "{typography.button-lg}"
    rounded: "{rounded.md}"
    padding: "15px 30px"
  
  button-secondary:
    backgroundColor: "{colors.accent-grey}"
    textColor: "{colors.ink-deep}"
    border: "{colors.border-ink}"
    boxShadow: "{colors.shadow-hard-sm}"
    typography: "{typography.body-md}"
    rounded: "{rounded.full}"
    padding: "10px 20px"

  card-main:
    backgroundColor: "{colors.accent-white}"
    border: "{colors.border-ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xxl}"
    boxShadow: "{colors.shadow-hard-card}"
    transform: "rotate(-1deg)" # Playful animated tilt

  text-input:
    backgroundColor: "{colors.accent-white}"
    textColor: "{colors.ink-deep}"
    border: "{colors.border-ink}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
    boxShadow: "{colors.shadow-hard-sm}"
---

## Overview

This design system delivers an **Inkwell Black & White** vintage cartoon workspace layout. The system ditches clean corporate aesthetics for heavy, hand-drawn ink outlines (`{colors.border-ink}`), an aged film stock background tint (`{colors.canvas-aged}`), and deep, hard shadow overlays that create an explosive 3D look without any blurs. 

Elements deliberately avoid standard symmetry. Cards use asymmetrical, organically rounded corner configurations (`{rounded.lg}`) and a subtle default rotational tilt (`transform: rotate(-1deg)`) to feel like individual hand-drawn animation cells waiting to spring to life. Typography uses bold, heavy-weight display font pairings to recreate early theatrical title cards.

**Key Characteristics:**
- High-contrast monochromatic color scheme relying heavily on deep ink fills and raw white accents.
- Thick, persistent ink outlines (`5px solid`) around all active and structural interfaces.
- Hard-edged, unblurred drop shadows replicating vintage printing plates and cel offsets.
- Asymmetrical bounding boxes and organic curves instead of generic layout grids.
- Immersive interactive states using physical "squash-and-stretch" button click behaviors.

## Colors

### Core Monochromatic Tones
- **Ink Deep** (`{colors.ink-deep}`): The absolute visual anchor. Used for heavy frame borders, dense display font strokes, and deep shadows.
- **Canvas Aged** (`{colors.canvas-aged}`): Soft, warm cream-grey tint that keeps the workspace from feeling sterile or clinical, mimicking vintage yellowed film stock.
- **Accent Grey** (`{colors.accent-grey}`): Mid-tone shading fill. Excellent for distinguishing secondary actions, passive text headers, or unselected checkbox states.
- **Accent White** (`{colors.accent-white}`): Punchy, clean contrast layer reserved strictly for inner card canvases, primary action buttons, and active inputs.

## Typography

### Font Family
- **Spicy Rice** (or equivalent theatrical retro cursive): Used for top-level, loud display titles. Brings an immediate animated theatrical energy.
- **Fredoka One** (or heavy round geometric fallbacks): Applied to general subheads, input fields, labels, and paragraph systems to maintain structural legibility without breaking the cartoon fantasy.

## Shapes & Depth

### Border Radius Scale
- `{rounded.md}` (12px): Standard uniform round for input elements and button bounding fields.
- `{rounded.lg}` (`30px 15px 30px 15px`): Highly stylized, alternating corner values that inject a hand-sketched structural look into container cards.

### Depth & Motion
Modern blurs are forbidden. All depth relies entirely on flat coordinate offsets:
- **Card Depth**: `{colors.shadow-hard-card}` (12px offset) brings extreme pop to background regions.
- **Tactile Squishing**: Primary buttons shift layout coordinates downward by exactly `6px` on click, matching a reduction in their `{colors.shadow-hard-btn}` height to replicate physical squishing.

## Components

### Buttons
- **`button-primary`**: The heavy-hitting action element. Coated in stark white (`{colors.accent-white}`), stamped with chunky text, and given a thick bottom shadow baseline.
- **`button-secondary`**: A more rounded, pill-like secondary option wrapped in `{colors.accent-grey}` to stay structurally distinct.

### Containers & Fields
- **`card-main`**: Employs the core asymmetrical layout engine. Sits tilted against the background canvas, responding dynamically to user hovering with scale adjustments and straight framing alignments.
- **`text-input`**: High-contrast tracking field framed by a persistent border and heavy internal typography. Focus modes trigger a swap to accent highlights, altering text layout depths.