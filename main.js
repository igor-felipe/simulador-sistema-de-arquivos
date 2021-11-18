// Igor Felipe Gomes de Lima
// Prática sistema de arquivos

var fileObjs = []; 
var blockSize; 
var memorySize; 
var tableColumns; 
var fileMap; // mapeamento dos blocos de file/folder na memória

var getcolor = (function () {
  let index = 0;
  let color = [
    "#de3163",
    "#ffbf00",
    "#ff7f50",
    "#9fe2bf",
    "#40e0d0",
    "#6495ed",
    "#005f73",
    "#ccccff",
    "#dfff00",
    "#6b705c",
    "#cb997e",
    "#a5a58d",
    "#ef3bff",
    "#ca6702",
    "#9b2226",
    "#32348f",
    "#023e8a",
    "#00b4d8",
    "#caffbf",
    "#ffc6ff",
    "#7209b7",
  ];
  return function () {
    if (index > color.length - 1) {
      index = 0;
    }
    return color[index++];
  };
})();

document.addEventListener(
  "click",
  (e) => {
    let item = e.target;

    // remove file/folder de todos os lugares
    if (item.className == "fa fa-minus-circle") {
      const li = item.parentNode;
      if (li.id != "/") {
        removeObj(li);
      }
    }

    // mostra os endereços de blocos de um inode
    if (item.tagName == "TD") {
      const tr = item.parentNode;
      let index = tr.firstChild.innerHTML;
      if (!fileObjs[index]) return;
      let inode = fileObjs[index]["inode"];
      let string = fileObjs[index]["name"];
      for (let index = 0; index < inode.length; index++) {
        string += `<br>@${inode[index]}`;
      }
      document.getElementById("inode").innerHTML = string;
    }

  },
  false
);

function removeObj(li) {
  // remove da arvore
  li.remove();

  // remove do fileObjs e do fileMap
  if (li.className == "folder") {
    // remove uma pasta e seu conteudo
    for (let index = 0; index < fileObjs.length; index++) {
      if (fileObjs[index] != null) {
        let id = fileObjs[index]["path"];
        if (id.indexOf(li.id) > -1) {
          removeFromFileMap(fileObjs[index]);
          fileObjs[index] = null;
        }
      }
    }
  } else {
    // remove um arquivo
    for (let index = 0; index < fileObjs.length; index++) {
      if (fileObjs[index] != null && fileObjs[index]["path"] == li.id) {
        removeFromFileMap(fileObjs[index]);
        fileObjs[index] = null;
        break;
      }
    }
  }

  // remove do fileObjs 
  for (let index = 0; index < fileObjs.length; index++) {
    if (fileObjs[index] != null) {
      let id = fileObjs[index]["path"];
      if (id.indexOf(li.id) > -1) {
        fileObjs[index] = null;
      }
    }
  }

    //remove de fileMap
  function removeFromFileMap(obj) {
    let inode = obj.inode;
    for (let index = 0; index < inode.length; index++) {
      blockAddress = inode[index];
      for (
        let index = blockAddress;
        index < blockSize + blockAddress;
        index++
      ) {
        fileMap[index] = null;
      }
    }
  }

  // atualiza a visualização
  updateInodeTable();
  updateFileSystem();
}

var count = 0;
function createTree(name, pathFather, type, size) {
  let path;

  if (!name) {
    name = type + count++;
  }

  // se o usuário esquecer de acrescentar / no final
  if (pathFather[pathFather.length - 1] != "/") {
    pathFather += "/";
  }

  // pastas recebem barra no final
  if (type == "folder") {
    path = pathFather + name + "/";
  } else {
    path = pathFather + name;
  }

  if (Array.isArray(fileObjs) && fileObjs.length > 0) {
    let found = 0;

    // o caminho deve existir
    found = fileObjs.find((element) => element && element.path == pathFather);
    if (!found) {
      alert(" O diretório " + pathFather + " não existe");
      return false;
    }
    // não permite nomes iguais numa mesma pasta
    found = fileObjs.find((element) => element && element.path == path);
    if (found) {
      alert(name + "Já existe neste diretório");
      return false;
    }
  } else return false;

  // se o tamanho não for informado, ou se for uma pasta
  if (!size) {
    size = blockSize;
  }

  reserveBlocks(name, pathFather, type, size, path);

  return false;
}
//----------------------------------------------------------------
function reserveBlocks(name, pathFather, type, size, path) {
  let inode = [];
  let fullBlocks = Math.floor(size / blockSize); // quantidade de blocos que serão ocupados por completo
  let totalBlocks = fullBlocks;
  let remainder = size % blockSize; // se o bloco é incompleto, qual seu tamanho
  if (remainder > 0) {
    // o total de blocos que devem ser reservados na memória, contando com o ultimo incompleto
    totalBlocks++;
  }

  // procura a quantidade necessária de blocks livres na memória;
  // percorre de acordo com o tamanho do block
  let countFreeBlocks = 0;
  for (
    let index = 0;
    index < fileMap.length && countFreeBlocks < totalBlocks;
    index += blockSize
  ) {
    if (!fileMap[index]) {
      inode[countFreeBlocks] = index;
      countFreeBlocks++;
    }
  }
  // verifica se a reserva foi feita
  if (countFreeBlocks != totalBlocks) {
    alert("Não há espaço suficiente na memória");
    return false;
  }

  let color = getcolor();

  writeBlocks(size, inode, color, path);

  //-------------------------------------------------------------------------
  // cria o obj file/folder, insere nos arrays e atualiza as tabelas

  let obj = {
    index: fileObjs.length,
    name: name,
    path: path,
    pathFather: pathFather,
    size: parseInt(size),
    type: type,
    color: color,
    inode: inode,
  };

  // insira na primeira posição vazia ou acrescente ao final do fileObjs
  for (index = 0; index <= fileObjs.length; index++) {
    if (fileObjs[index] == null) {
      fileObjs[index] = obj;
      break;
    } else if (index == fileObjs.length) {
      fileObjs[fileObjs.length] = obj;
    }
  }

  if (type == "folder") {
    if (path != "/") addFolder(obj);
  } else {
    addFile(obj);
  }

  updateInodeTable();
  updateFileSystem();

  return false;
}

function writeBlocks(size, inode, color, path) {
  // escreve nos blocks reservados
  let sizeIndex = size;
  for (let index = 0; index < inode.length; index++) {
    blockAddress = inode[index];
    for (let index = blockAddress; index < blockSize + blockAddress; index++) {
      if (sizeIndex > 0) {
        sizeIndex--;
        fileMap[index] = [path, color];
      } else {
        fileMap[index] = [path, 1];
      }
    }
  }
}

function addFolder(obj) {
  let path = obj.path;
  let name = obj.name;
  let father = document.getElementById(obj.pathFather);

  let li = document.createElement("li");
  li.setAttribute("class", "folder");
  li.setAttribute("id", path);

  let ul = document.createElement("ul");

  li.innerHTML = `<i class="fa fa-folder"></i>${name}<i class="fa fa-minus-circle"></i>`;

  li.appendChild(ul);
  let fatherUl = father.querySelector("ul");
  fatherUl.appendChild(li);
  updateInodeTable();

  console.log(father);
  return false;
}

function addFile(obj) {
  let path = obj.path;
  let name = obj.name;
  let size = obj.size;
  let father = document.getElementById(obj.pathFather);

  let li = document.createElement("li");
  li.setAttribute("id", path);

  let ul = document.createElement("ul");

  li.innerHTML = `<i class="fa fa-file"></i>${name} <span class="info">${size}KB</span><i class="fa fa-minus-circle"></i>`;

  li.appendChild(ul);
  let fatherUl = father.querySelector("ul");
  fatherUl.appendChild(li);

  console.log(father);
  return false;
}

function updateInodeTable() {
  let tbody = document.getElementById("tbodyInodeTable");
  let thead = document.getElementById("theadInodeTable");
  let tableSize = fileObjs.length;
  let tableColumns = thead.rows[0].cells.length;

  tbody.innerHTML = "";
  // add as linha
  for (let index = 0; index < tableSize; index++) {
    let linha = tbody.insertRow(index);
    // celulas na linha
    for (let index = 0; index < tableColumns; index++) {
      linha.insertCell(index);
    }

    tbody.rows[index].cells[0].innerHTML = index;
    if (fileObjs[index]) {
      tbody.rows[index].cells[1].innerHTML = fileObjs[index]["name"];
      tbody.rows[index].style.backgroundColor = fileObjs[index]["color"];
    }
  }
}

// chamada pelo botão de confirmação, e roda apenas 1 vez.
function settings(memory, block, Columns, reserve) {
  if (settings.on) {
    return false;
  }
  settings.on = true;

  memorySize = parseInt(memory);
  blockSize = parseInt(block);
  Columns = parseInt(Columns);
  tableColumns = Columns * blockSize;
  fileMap = new Array(memorySize);

  // escreve o espaço reservado
  let size = reserve * blockSize || memorySize / blockSize;
  for (let index = 0; index < size; index++) {
    fileMap[index] = ["system", "gray"];
  }

  updateInodeTable();
  // cria a pasta raiz
  reserveBlocks("/", "/", "folder", blockSize, "/");
  updateFileSystem();
  return false;
}

function updateFileSystem() {
  var tbody = document.getElementById("tbodyFileSystem");
  let tableRows = memorySize / tableColumns;

  let mapIndex = 0;

  tbody.innerHTML = "";

  // add as linhas
  for (let index1 = 0; index1 < tableRows; index1++) {
    let linha = tbody.insertRow(index1);
    // celulas na linha
    for (let index2 = 0; index2 < tableColumns; index2++) {
      let cell = linha.insertCell(index2);

      cell.innerHTML = 0;

      let item = fileMap[mapIndex];
      // item =! undefined &&
      if (item == null) {
      } else if (item[1] == 1) {
        cell.setAttribute("class", "frag");
      } else {
        cell.style.backgroundColor = fileMap[mapIndex][1];
      }
      mapIndex++;

      // cria os blocos removendo bordas de celulas

      if (blockSize != 1) {
        let mod = index2 % blockSize;
        if (mod == 0) {
          cell.style.borderRight = "0px";
        } else if (mod == blockSize - 1) {
          cell.style.borderLeft = "0px";
        } else {
          cell.style.borderLeft = "0px";
          cell.style.borderRight = "0px";
        }
      }
    }
  }

  // cria uma tabela com os endereços de memória
  let memoryTable = document.getElementById("tbodyMemory");
  memoryTable.innerHTML = "";
  for (let jk = 0; jk < tableRows; jk++) {
    let linhaMemoryTable = memoryTable.insertRow(jk);
    // celulas na linha
    let cellMemory = linhaMemoryTable.insertCell(0);
    cellMemory.innerHTML = "@" + jk * tableColumns;
  }

  return false;
}

