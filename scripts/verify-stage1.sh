#!/bin/bash

# ============================================================
# Stage 1 Verification Script
# Run this BEFORE trying to run the app
# ============================================================

set -e  # Exit on first error

echo "🔍 Stage 1 Verification Starting..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# ──────────────────────────────────────────────────────────
# 1. Check required files exist
# ──────────────────────────────────────────────────────────
echo "📁 Checking required files..."

check_file() {
    if [ -f "$1" ]; then
        echo -e "  ${GREEN}✓${NC} $1"
    else
        echo -e "  ${RED}✗${NC} $1 - MISSING!"
        ERRORS=$((ERRORS + 1))
    fi
}

check_file "server/src/index.ts"
check_file "web/src/helpers.ts"
check_file "web/src/widgets/stash-board.tsx"
check_file "web/src/widgets/stash-status.tsx"
check_file "web/src/index.css"
check_file "package.json"

echo ""

# ──────────────────────────────────────────────────────────
# 2. Check widget filenames match kebab-case convention
# ──────────────────────────────────────────────────────────
echo "📝 Checking widget naming convention..."

if [ -f "web/src/widgets/StashBoard.tsx" ]; then
    echo -e "  ${RED}✗${NC} StashBoard.tsx should be stash-board.tsx (kebab-case)"
    ERRORS=$((ERRORS + 1))
else
    echo -e "  ${GREEN}✓${NC} No PascalCase widget files"
fi

echo ""

# ──────────────────────────────────────────────────────────
# 3. Check server imports are correct
# ──────────────────────────────────────────────────────────
echo "📦 Checking server imports..."

if grep -q "@anthropic-ai/skybridge" server/src/index.ts 2>/dev/null; then
    echo -e "  ${RED}✗${NC} Wrong import: @anthropic-ai/skybridge"
    echo "      Should be: skybridge/server"
    ERRORS=$((ERRORS + 1))
else
    echo -e "  ${GREEN}✓${NC} No wrong @anthropic-ai imports"
fi

if grep -q "from \"skybridge/server\"" server/src/index.ts 2>/dev/null || \
   grep -q "from 'skybridge/server'" server/src/index.ts 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Correct skybridge/server import"
else
    echo -e "  ${YELLOW}⚠${NC} Check server import statement"
fi

echo ""

# ──────────────────────────────────────────────────────────
# 4. Check widget files have required patterns
# ──────────────────────────────────────────────────────────
echo "🧩 Checking widget patterns..."

check_widget_pattern() {
    local file=$1
    local name=$2

    if [ ! -f "$file" ]; then
        return
    fi

    # Check for mountWidget
    if grep -q "mountWidget" "$file"; then
        echo -e "  ${GREEN}✓${NC} $name has mountWidget()"
    else
        echo -e "  ${RED}✗${NC} $name missing mountWidget() call"
        ERRORS=$((ERRORS + 1))
    fi

    # Check for CSS import
    if grep -q "@/index.css" "$file"; then
        echo -e "  ${GREEN}✓${NC} $name imports CSS"
    else
        echo -e "  ${RED}✗${NC} $name missing CSS import"
        ERRORS=$((ERRORS + 1))
    fi

    # Check for default export
    if grep -q "export default" "$file"; then
        echo -e "  ${GREEN}✓${NC} $name has default export"
    else
        echo -e "  ${RED}✗${NC} $name missing default export"
        ERRORS=$((ERRORS + 1))
    fi
}

check_widget_pattern "web/src/widgets/stash-board.tsx" "stash-board"
check_widget_pattern "web/src/widgets/stash-status.tsx" "stash-status"

echo ""

# ──────────────────────────────────────────────────────────
# 5. Check helpers file
# ──────────────────────────────────────────────────────────
echo "🔧 Checking helpers.ts..."

if [ -f "web/src/helpers.ts" ]; then
    if grep -q "skybridge/web" "web/src/helpers.ts"; then
        echo -e "  ${GREEN}✓${NC} Correct skybridge/web import"
    else
        echo -e "  ${RED}✗${NC} Wrong import in helpers.ts"
        ERRORS=$((ERRORS + 1))
    fi

    if grep -q "useToolInfo" "web/src/helpers.ts"; then
        echo -e "  ${GREEN}✓${NC} Exports useToolInfo"
    else
        echo -e "  ${RED}✗${NC} Missing useToolInfo export"
        ERRORS=$((ERRORS + 1))
    fi
fi

echo ""

# ──────────────────────────────────────────────────────────
# 6. Check dependencies installed
# ──────────────────────────────────────────────────────────
echo "📚 Checking dependencies..."

if [ -d "node_modules" ]; then
    echo -e "  ${GREEN}✓${NC} node_modules exists"
else
    echo -e "  ${YELLOW}⚠${NC} Run: npm install"
fi

echo ""

# ──────────────────────────────────────────────────────────
# Results
# ──────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Ready to run: npm run dev${NC}"
else
    echo -e "${RED}❌ Found $ERRORS error(s). Fix them before running.${NC}"
    exit 1
fi
echo "════════════════════════════════════════════════════════"
