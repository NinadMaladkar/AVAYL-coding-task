function formatText(command) {
  document.execCommand(command, false, null);
}

function insertTable() {
  const table = `
    <table border="1" style="width: 100%; margin: 10px 0;">
      <tr><td>Cell 1</td><td>Cell 2</td></tr>
      <tr><td>Cell 3</td><td>Cell 4</td></tr>
    </table>`;
  document.execCommand("insertHTML", false, table);
}

function insertList(type) {
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);
  const list = document.createElement(type);
  const listItem = document.createElement("li");
  listItem.textContent = "List item";
  list.appendChild(listItem);
  range.deleteContents();
  range.insertNode(list);

  const newItem = document.createElement("li");
  newItem.appendChild(document.createElement("br"));
  list.appendChild(newItem);

  const newRange = document.createRange();
  newRange.setStart(newItem, 0);
  newRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(newRange);
}

function insertImage() {
  const imageUrl = prompt("Please enter the image URL:");
  if (imageUrl) {
    const img = `<img src="${imageUrl}" alt="Inserted image" style="max-width: 100%; height: auto;">`;
    document.execCommand("insertHTML", false, img);
  }
}

function insertCaretMarker() {
  const sel = window.getSelection();
  if (sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const marker = document.createElement("span");
    marker.id = "caret-marker";
    marker.style.display = "inline-block";
    marker.style.width = "0px";
    marker.style.height = "1em";
    range.insertNode(marker);
  }
}

function restoreCaretToMarker() {
  const marker = document.getElementById("caret-marker");
  if (!marker) return;
  const range = document.createRange();
  range.setStartAfter(marker);
  range.collapse(true);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  const caretRect = marker.getBoundingClientRect();
  window.scrollTo({
    top: window.scrollY + caretRect.top - window.innerHeight / 2,
    behavior: "auto",
  });
  marker.remove();
}

function flushPage(editor, currentPage, pageHeight) {
  if (currentPage.childNodes.length > 0) {
    editor.appendChild(currentPage);
    const hr = document.createElement("hr");
    hr.className = "page-break-hr";
    editor.appendChild(hr);
  }
  const newPage = document.createElement("div");
  newPage.className = "page";
  newPage.style.height = pageHeight + "px";
  newPage.style.minHeight = pageHeight + "px";
  newPage.style.maxHeight = pageHeight + "px";
  newPage.style.position = "relative";
  newPage.style.boxSizing = "border-box";
  newPage.contentEditable = "true";
  return { newPage, newHeight: 0 };
}

function splitBlockTextAcrossPages(blockNode, tagName, measureDiv, pageHeight) {
  const blocks = [];
  const text = blockNode.textContent;
  const words = text.split(" ");
  let tempWords = [];
  let tempBlock = document.createElement(tagName);

  for (let i = 0; i < words.length; i++) {
    tempWords.push(words[i]);
    tempBlock.textContent = tempWords.join(" ");
    measureDiv.innerHTML = "";
    measureDiv.appendChild(tempBlock);
    const blockHeight = measureDiv.scrollHeight;

    if (blockHeight > pageHeight && tempWords.length > 1) {
      // Push block without last word
      const newBlock = document.createElement(tagName);
      newBlock.textContent = tempWords.slice(0, -1).join(" ");
      blocks.push(newBlock);

      // Start new block with last word
      tempWords = [words[i]];
      tempBlock = document.createElement(tagName);
    }
  }

  if (tempWords.length > 0) {
    const finalBlock = document.createElement(tagName);
    finalBlock.textContent = tempWords.join(" ");
    blocks.push(finalBlock);
  }

  return blocks;
}

function splitListAcrossPages(listNode, measureDiv, pageHeight) {
  const items = Array.from(listNode.children);
  const lists = [];
  let tempList = listNode.cloneNode(false);

  for (let i = 0; i < items.length; i++) {
    const itemClone = items[i].cloneNode(true);

    tempList.appendChild(itemClone);

    measureDiv.innerHTML = "";
    measureDiv.appendChild(tempList.cloneNode(true));
    const listHeight = measureDiv.scrollHeight;

    if (listHeight > pageHeight && tempList.childNodes.length > 1) {
      tempList.removeChild(tempList.lastChild);
      lists.push(tempList);

      // Start new list with current item
      tempList = listNode.cloneNode(false);
      tempList.appendChild(itemClone);
    } else if (listHeight > pageHeight) {
      lists.push(tempList);

      tempList = listNode.cloneNode(false);
      tempList.appendChild(itemClone);
    }
  }

  if (tempList.childNodes.length > 0) {
    lists.push(tempList);
  }

  return lists;
}

function setPageBreak() {
  const pageHeight = parseInt(document.getElementById("pageHeight").value);
  const editor = document.getElementById("editor");
  const images = editor.querySelectorAll("img");

  let rawContent = "";
  const allPages = editor.querySelectorAll(".page");
  if (allPages.length > 0) {
    allPages.forEach((page) => {
      rawContent += page.innerHTML;
    });
  } else {
    rawContent = editor.innerHTML;
  }

  editor.innerHTML = "";

  const tempContainer = document.createElement("div");
  tempContainer.innerHTML = rawContent;
  const nodes = Array.from(tempContainer.childNodes);

  const measureDiv = document.createElement("div");
  measureDiv.style.visibility = "hidden";
  measureDiv.style.position = "absolute";
  measureDiv.style.width = editor.offsetWidth + "px";
  document.body.appendChild(measureDiv);

  let currentPage = document.createElement("div");
  currentPage.className = "page";
  currentPage.style.height = pageHeight + "px";
  currentPage.style.minHeight = pageHeight + "px";
  currentPage.style.maxHeight = pageHeight + "px";
  currentPage.style.position = "relative";
  currentPage.style.boxSizing = "border-box";
  currentPage.contentEditable = "true";
  let currentHeight = 0;

  for (let node of nodes) {
    if (
      node.nodeType === 1 &&
      (node.tagName === "DIV" || node.tagName === "P")
    ) {
      if (
        !node.textContent.trim() &&
        !node.querySelector("img, ul, ol, table")
      ) {
        continue;
      }
      const clonedNode = node.cloneNode(true);

      const images = clonedNode.querySelectorAll("img");
      images.forEach((img) => {
        const tempImg = img.cloneNode(true);
        measureDiv.innerHTML = "";
        measureDiv.appendChild(tempImg);
        const imgMeasuredHeight = measureDiv.scrollHeight;

        if (imgMeasuredHeight >= pageHeight) {
          img.style.display = "block";
          img.style.maxHeight = pageHeight - 40 + "px";
          img.style.width = "auto";
          img.style.margin = "0 auto";
        }
      });

      const innerLists = clonedNode.querySelectorAll("ul, ol");

      innerLists.forEach((list) => {
        const splitLists = splitListAcrossPages(node, measureDiv, pageHeight);
        if (splitLists.length > 0) {
          // Remove original list node
          list.remove();

          // Insert split lists in its place inside clonedNode
          splitLists.forEach((part) => {
            clonedNode.appendChild(part);
          });
        }
        for (const smallList of splitLists) {
          measureDiv.innerHTML = "";
          measureDiv.appendChild(smallList);
          const listHeight = measureDiv.scrollHeight;

          if (currentHeight + listHeight > pageHeight && currentHeight > 0) {
            const { newPage, newHeight } = flushPage(
              editor,
              currentPage,
              pageHeight
            );
            currentPage = newPage;
            currentHeight = newHeight;
          }
          currentPage.appendChild(smallList);
          currentHeight += listHeight;
        }
      });

      measureDiv.innerHTML = "";
      measureDiv.appendChild(clonedNode);
      const nodeHeight = measureDiv.scrollHeight;

      if (nodeHeight > pageHeight) {
        const splitBlocks = splitBlockTextAcrossPages(
          clonedNode,
          node.tagName,
          measureDiv,
          pageHeight
        );
        for (const smallBlock of splitBlocks) {
          if (
            !smallBlock.textContent.trim() &&
            !smallBlock.querySelector("img, ul, ol")
          ) {
            continue; // skip empty
          }
          measureDiv.innerHTML = "";
          measureDiv.appendChild(smallBlock);
          const smallHeight = measureDiv.scrollHeight;
          if (currentHeight + smallHeight > pageHeight && currentHeight > 0) {
            const { newPage, newHeight } = flushPage(
              editor,
              currentPage,
              pageHeight
            );
            currentPage = newPage;
            currentHeight = newHeight;
          }
          currentPage.appendChild(smallBlock);
          currentHeight += smallHeight;
        }
      } else {
        if (currentHeight + nodeHeight > pageHeight && currentHeight > 0) {
          const { newPage, newHeight } = flushPage(
            editor,
            currentPage,
            pageHeight
          );
          currentPage = newPage;
          currentHeight = newHeight;
        }
        currentPage.appendChild(clonedNode);
        currentHeight += nodeHeight;
      }
    } else {
      measureDiv.innerHTML = "";
      measureDiv.appendChild(node.cloneNode(true));
      const nodeHeight = measureDiv.scrollHeight;

      if (currentHeight + nodeHeight > pageHeight && currentHeight > 0) {
        const { newPage, newHeight } = flushPage(
          editor,
          currentPage,
          pageHeight
        );
        currentPage = newPage;
        currentHeight = newHeight;
      }
      currentPage.appendChild(node.cloneNode(true));
      currentHeight += nodeHeight;

      images.forEach((img) => {
        if (img.height >= pageHeight) {
          img.style.display = "block";
          img.style.maxHeight = pageHeight - 40 + "px";
          img.style.width = "auto";
          img.style.margin = "0 auto";
        }
      });
    }
  }

  if (currentPage.childNodes.length > 0) {
    editor.appendChild(currentPage);
  }
  document.body.removeChild(measureDiv);

  const hrs = editor.querySelectorAll(".page-break-hr");
  if (hrs.length > 0 && hrs[hrs.length - 1].nextSibling === null) {
    editor.removeChild(hrs[hrs.length - 1]);
  }
}

const editor = document.getElementById("editor");
editor.addEventListener(
  "focus",
  function () {
    if (editor.textContent === "Start typing here...") {
      editor.textContent = "";
    }
  },
  { once: true }
);

let paginationTimeout = null;
editor.addEventListener("input", function () {
  clearTimeout(paginationTimeout);
  paginationTimeout = setTimeout(() => {
    requestAnimationFrame(() => {
      insertCaretMarker();
      editor.style.visibility = "hidden";
      setPageBreak();
      editor.style.visibility = "visible";
      requestAnimationFrame(() => {
        restoreCaretToMarker();
      });
    });
  }, 500);
});
