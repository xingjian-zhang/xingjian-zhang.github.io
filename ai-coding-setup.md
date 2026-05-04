---
title: "AI Coding Workshop — Dev Setup"
description: "How to reproduce the cmux + Typst + Neovim + Claude Code workflow."
---

# Dev setup: cmux + Typst + Neovim + Claude Code

A self-contained recipe to reproduce the workflow shown in the appendix slide:
**Neovim editing a Typst slide deck, live preview rendered inside cmux's built-in
browser pane, and a sibling Claude Code (or Codex) pane that can be fed visual
selections from the editor with one keystroke.**

This file is structured so you can also paste the whole thing into a fresh Claude
Code session and ask it to merge the snippets into your existing config. There's
a ready-to-use prompt at the bottom.

---

## 1. Prerequisites

- **macOS or Linux**, with Homebrew (or apt/pacman).
- **Neovim ≥ 0.10** (0.11+ preferred for native `vim.lsp.enable`).
- **git** on your `PATH`.
- A **Claude Code** install (`claude` on `PATH`) — or any sibling AI CLI; the
  bridge is title-agnostic.

## 2. Install the tools

```bash
# macOS
brew install cmux neovim typst tinymist

# Debian/Ubuntu
sudo apt install neovim git
# typst, tinymist, cmux: install via their official installers / releases.
# - typst:    https://github.com/typst/typst/releases
# - tinymist: https://github.com/Myriad-Dreamin/tinymist/releases
# - cmux:     https://cmux.com
```

Verify:

```bash
cmux --version && nvim --version | head -1 && typst --version && tinymist --version
```

## 3. Bootstrap a Typst slide deck

```bash
mkdir my-slides && cd my-slides
git clone https://github.com/xingjian-zhang/gh-minimal-slides gh-theme
```

Create `slides.typ`:

```typst
#import "@preview/touying:0.5.3": *
#import "gh-theme/lib.typ" as gh

#show: gh.register.with(theme: "light", accent: "green", title: [My Deck])

#gh.cover-slide(title: [Hello])

#gh.content-slide(title: [First slide])[
  - Bullet
  - Another bullet
]
```

Smoke-test the build:

```bash
typst compile slides.typ      # one-shot
typst watch slides.typ        # rebuild on save (fallback if you skip the nvim setup)
```

## 4. Neovim plugins

Uses `lazy.nvim`. If you don't have a Neovim config yet, the minimum is:

```lua
-- ~/.config/nvim/init.lua
vim.g.mapleader = " "
vim.g.maplocalleader = ","

-- bootstrap lazy.nvim (skip if already installed)
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not (vim.uv or vim.loop).fs_stat(lazypath) then
  vim.fn.system({ "git", "clone", "--filter=blob:none",
    "https://github.com/folke/lazy.nvim.git", "--branch=stable", lazypath })
end
vim.opt.rtp:prepend(lazypath)

require("lazy").setup({
  -- plugins below
})
```

### 4a. tinymist LSP (Typst language server)

```lua
{
  "neovim/nvim-lspconfig",
  config = function()
    if vim.lsp.enable then          -- Neovim 0.11+
      vim.lsp.enable("tinymist")
    else                             -- fallback for older Neovim
      require("lspconfig").tinymist.setup({})
    end
  end,
},
```

### 4b. Typst live preview, opened into a cmux browser pane

```lua
{
  "chomosuke/typst-preview.nvim",
  ft = "typst",
  version = "1.*",
  build = function() require("typst-preview").update() end,
  opts = {
    dependencies_bin = { ["tinymist"] = "tinymist" },  -- reuse system tinymist
    -- Open preview in a cmux browser pane. cmux routes `localhost` to the
    -- remote host transparently when inside an SSH workspace, so the same
    -- command works on Mac and remote. Falls back to system browser if
    -- cmux isn't on PATH.
    open_cmd = 'U=%s; (command -v cmux >/dev/null && cmux browser open "$U") || open "$U" 2>/dev/null || xdg-open "$U"',
  },
  keys = {
    { "<localleader>lp", "<cmd>TypstPreview<cr>",                   ft = "typst", desc = "Typst: start preview" },
    { "<localleader>ls", "<cmd>TypstPreviewStop<cr>",               ft = "typst", desc = "Typst: stop preview" },
    { "<localleader>lt", "<cmd>TypstPreviewToggle<cr>",             ft = "typst", desc = "Typst: toggle preview" },
    { "<localleader>lf", "<cmd>TypstPreviewFollowCursorToggle<cr>", ft = "typst", desc = "Typst: toggle follow-cursor" },
    {
      "<localleader>lc",
      function()
        -- tinymist's preview-from-cursor only resolves source positions that
        -- map to rendered content; on argument lines like `title: [foo],` or
        -- bare `items: (`, the request silently no-ops. Walk to the nearest
        -- `[` (search backward, then forward), sync from there, and restore
        -- the original cursor.
        local row = vim.api.nvim_win_get_cursor(0)[1]
        local lines = vim.api.nvim_buf_get_lines(0, 0, -1, false)
        local target_row, target_col
        for i = row, 1, -1 do
          local col = lines[i] and lines[i]:find("%[")
          if col then target_row, target_col = i, col - 1; break end
        end
        if not target_row then
          for i = row + 1, #lines do
            local col = lines[i]:find("%[")
            if col then target_row, target_col = i, col - 1; break end
          end
        end
        if not target_row then
          vim.cmd("TypstPreviewSyncCursor")
          return
        end
        local save = vim.api.nvim_win_get_cursor(0)
        if target_row ~= save[1] or target_col ~= save[2] then
          vim.api.nvim_win_set_cursor(0, { target_row, target_col })
        end
        vim.cmd("TypstPreviewSyncCursor")
        vim.api.nvim_win_set_cursor(0, save)
      end,
      ft = "typst",
      desc = "Typst: smart sync to nearest content",
    },
  },
},
```

## 5. The cmux ↔ Neovim send-selection bridge

This is the piece that makes the screenshot's workflow work: visually select a
range in the editor, hit `<leader>cc`, and a `@file#L<a>-L<b>` reference lands
in the closest sibling Claude / Codex pane (or a freshly spawned one). It uses
cmux's RPC surface — `identify`, `pane.list`, `surface.list`,
`surface.send_text`, `surface.focus`, plus `cmux-spawn` for new panes — so it's
title-agnostic and works for any AI CLI running in a sibling terminal.

Drop this verbatim into your `init.lua` (anywhere outside the `lazy.setup({...})`
table — top level is fine):

```lua
-- Send visual selection as @file#L<a>-L<b> to a sibling cmux terminal pane
-- (Claude Code, Codex, or any AI CLI — agnostic). Pastes the ref without
-- submitting (no Enter). <leader>cc picks the nearest sibling terminal
-- (preferring the one selected in its pane); if there is no sibling it
-- spawns a fresh claude in a vertical split. <leader>cC always spawns.
local cmux = {}

local function notify_err(msg)
  vim.schedule(function() vim.notify("[cmux-cc] " .. msg, vim.log.levels.ERROR) end)
end

local function notify_info(msg)
  vim.schedule(function() vim.notify("[cmux-cc] " .. msg) end)
end

-- Run a command async; decode stdout as JSON. Calls cb(decoded, err).
local function run_json(cmd, cb)
  vim.system(cmd, { text = true }, function(res)
    if res.code ~= 0 then
      local err = res.stderr ~= "" and res.stderr or ("exit " .. res.code)
      cb(nil, err)
      return
    end
    local ok, decoded = pcall(vim.json.decode, res.stdout)
    if not ok then
      cb(nil, "json decode failed: " .. (res.stdout or ""):sub(1, 200))
      return
    end
    cb(decoded, nil)
  end)
end

function cmux.build_ref()
  local lstart = vim.fn.line("v")
  local lend = vim.fn.line(".")
  if lstart > lend then lstart, lend = lend, lstart end

  local file = vim.api.nvim_buf_get_name(0)
  if file == "" then return nil, "current buffer has no file" end
  file = vim.fn.fnamemodify(file, ":p")

  local git_root = vim.b.cmux_git_root
  if not git_root then
    local file_dir = vim.fn.fnamemodify(file, ":h")
    local out = vim.fn.systemlist({ "git", "-C", file_dir, "rev-parse", "--show-toplevel" })[1]
    git_root = (vim.v.shell_error == 0 and out and out ~= "") and out or file_dir
    vim.b.cmux_git_root = git_root
  end

  local rel = file
  if file:sub(1, #git_root + 1) == git_root .. "/" then
    rel = file:sub(#git_root + 2)
  end

  local ref = lstart == lend
    and string.format("@%s#L%d", rel, lstart)
    or string.format("@%s#L%d-%d", rel, lstart, lend)
  return { ref = ref, git_root = git_root }
end

function cmux.paste_ref(surface_id, ref, cb)
  local params = vim.json.encode({ surface_id = surface_id, text = ref .. " " })
  run_json({ "cmux", "rpc", "surface.send_text", params }, function(_, err)
    cb(err)
  end)
end

function cmux.focus_surface(surface_id, cb)
  local params = vim.json.encode({ surface_id = surface_id })
  run_json({ "cmux", "rpc", "surface.focus", params }, function(_, err)
    cb(err)
  end)
end

-- Paste then focus the target so the cursor lands in the destination pane.
function cmux.deliver(surface_id, ref, cb)
  cmux.paste_ref(surface_id, ref, function(perr)
    if perr then cb(perr); return end
    cmux.focus_surface(surface_id, function(ferr)
      cb(ferr and ("focus: " .. ferr) or nil)
    end)
  end)
end

function cmux.pick_target(me, panes, surfaces)
  local panes_by_ref, my_pane = {}, nil
  for _, p in ipairs(panes.panes or {}) do
    panes_by_ref[p.ref] = p
    if p.ref == me then my_pane = p end
  end
  if not my_pane then return nil, "caller pane not found in pane.list" end
  local my_x = (my_pane.pixel_frame and my_pane.pixel_frame.x) or 0

  -- Per sibling pane, keep the surface that's selected (visible). Then pick
  -- the pane closest to the caller by x-pixel. Title-agnostic: works for
  -- Claude, Codex, or any other AI CLI running in a sibling terminal.
  local by_pane = {}
  for _, s in ipairs(surfaces.surfaces or {}) do
    local p = panes_by_ref[s.pane_ref]
    if s.pane_ref ~= me and s.type == "terminal" and p then
      local px = (p.pixel_frame and p.pixel_frame.x) or 0
      local entry = {
        surface = s.ref, pane = s.pane_ref,
        dist = math.abs(px - my_x), selected = s.selected_in_pane,
      }
      local prev = by_pane[s.pane_ref]
      if not prev or (s.selected_in_pane and not prev.selected) then
        by_pane[s.pane_ref] = entry
      end
    end
  end

  local candidates = {}
  for _, e in pairs(by_pane) do table.insert(candidates, e) end
  if #candidates == 0 then return { surface = nil } end
  table.sort(candidates, function(a, b)
    if a.selected ~= b.selected then return a.selected end
    return a.dist < b.dist
  end)
  return { surface = candidates[1].surface }
end

function cmux.find_target(cb)
  run_json({ "cmux", "identify" }, function(id, err)
    if err then cb(nil, "cmux identify: " .. err); return end
    local caller = id and id.caller or {}
    local ws, me = caller.workspace_ref, caller.pane_ref
    if not ws or not me then cb(nil, "cmux identify: missing caller info"); return end

    local params = vim.json.encode({ workspace_id = ws })
    local panes_res, surfaces_res, settled = nil, nil, false
    local function settle(err2, target)
      if settled then return end
      settled = true
      cb(target, err2)
    end
    local function maybe_finish()
      if settled or not panes_res or not surfaces_res then return end
      local target, perr = cmux.pick_target(me, panes_res, surfaces_res)
      settle(perr, target)
    end
    run_json({ "cmux", "rpc", "pane.list", params }, function(p, perr)
      if perr then settle("pane.list: " .. perr); return end
      panes_res = p; maybe_finish()
    end)
    run_json({ "cmux", "rpc", "surface.list", params }, function(s, serr)
      if serr then settle("surface.list: " .. serr); return end
      surfaces_res = s; maybe_finish()
    end)
  end)
end

function cmux.spawn_and_paste(git_root, ref, cb)
  local cmd = {
    "cmux-spawn", "--split=right", "--dir", git_root,
    "--", "claude", "--dangerously-skip-permissions",
  }
  run_json(cmd, function(res, err)
    if err then cb("cmux-spawn: " .. err); return end
    if res.status ~= "ok" or not res.surface_id then
      cb("cmux-spawn: " .. (res.message or res.status or "unknown error"))
      return
    end
    cmux.deliver(res.surface_id, ref, cb)
  end)
end

function cmux.send(force_new)
  local refdata, rerr = cmux.build_ref()
  vim.api.nvim_input("<Esc>")
  if rerr then notify_err(rerr); return end

  local function done(err)
    if err then notify_err(err) else notify_info("sent " .. refdata.ref) end
  end

  if force_new then
    cmux.spawn_and_paste(refdata.git_root, refdata.ref, done)
    return
  end

  cmux.find_target(function(target, ferr)
    if ferr then notify_err(ferr); return end
    if target.surface then
      cmux.deliver(target.surface, refdata.ref, done)
    else
      cmux.spawn_and_paste(refdata.git_root, refdata.ref, done)
    end
  end)
end

vim.keymap.set("v", "<leader>cc", function() cmux.send(false) end,
  { desc = "Send selection ref to AI sibling pane / auto-spawn Claude" })
vim.keymap.set("v", "<leader>cC", function() cmux.send(true) end,
  { desc = "Send selection ref (force new Claude cmux pane)" })
```

Want the same trick for HTML / Markdown previews? Bridge for `g:mkdp_browserfunc`
(markdown-preview.nvim) and friends:

```lua
vim.cmd([[
  function! OpenInCmuxBrowser(url) abort
    call jobstart('U=' . shellescape(a:url) . '; (command -v cmux >/dev/null && cmux browser open "$U") || open "$U" 2>/dev/null || xdg-open "$U"')
  endfunction
]])
-- then: vim.g.mkdp_browserfunc = "OpenInCmuxBrowser"
```

## 6. Smoke test

1. `cd my-slides && cmux` (or open cmux and `cd` into the project).
2. In one pane: `nvim slides.typ`.
3. Hit `<localleader>lp` — a new cmux browser tab/pane opens with the rendered
   preview. Save the file; the preview updates live.
4. Try `<localleader>lf` to make the preview follow your cursor, and
   `<localleader>lc` to jump-sync from any cursor position.
5. In another cmux pane (same workspace): `claude` (or `codex`).
6. Back in nvim, visually select a few lines and hit `<leader>cc`. The selection
   reference (`@slides.typ#L20-L24`) appears in the AI pane, focus jumps there,
   nothing is auto-submitted — you finish the sentence.
7. With no AI pane open, `<leader>cc` (or `<leader>cC` to force) spawns a fresh
   `claude` to the right and delivers the ref.

## 7. Hand-it-to-Claude-Code prompt

If you'd rather have Claude Code do the integration for you, paste this into a
fresh session inside your dotfiles repo:

> I want to set up the workflow described in `dev-setup.md` (cmux + Typst +
> Neovim + Claude Code). Please:
>
> 1. Check whether `cmux`, `tinymist`, `typst`, and `nvim` are on my `PATH`.
>    Tell me what's missing and the install command for my OS.
> 2. Find my Neovim config (`~/.config/nvim/init.lua` or equivalent). If I
>    already use `lazy.nvim`, merge the `typst-preview.nvim` plugin spec from
>    section 4b of `dev-setup.md` into my existing plugin list. Do not
>    duplicate plugins I already have.
> 3. Append the cmux ↔ Neovim bridge from section 5 verbatim, but only if it
>    isn't already present. Preserve my current `<leader>` and `<localleader>`
>    if I've set them; otherwise add the defaults (`<space>` and `,`).
> 4. Print a one-line smoke-test plan I can run in cmux to confirm everything
>    works (see section 6).
>
> Show me the diff before writing anything.
