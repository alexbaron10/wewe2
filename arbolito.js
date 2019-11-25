

  // ****************** Variables Globales
  let   gl = null,
        canvas = null,
        glProgram = null,
        fragmentShader = null,
        vertexShader = null;
  let   positionLocatAttrib =null,
        colorLocatAttrib=null;

  let   verticeBuffer = null;
  let   vertices=null; //coord de los vértices
  let   hojaBuffer=null;
  let   hojas=null; //coord de las hojas
  let   petalos=null; //coord de los petalos, reutilizare el buffer de hojas


  let   t=0; //variable "tiempo" (en verdad es un desplazamiento en x ) para el movimiento de los petalos
  let   incrementot=0.0000025; //incremento del tiempo 
  let   colorVertices=null,coloresHojas=null,coloresPetalos=[], //colores
        colorBuffer; //buffer de colores a cada vertice

  let ratonAbajo = false;
  let posRatonX = null;
  let posRatonY = null;
  let dibujapetalos=true; //flag que indica si debemos dibujar los petalos o no
  let dibujahojas=true; //flag que indica si debemos dibujar las hojas o no
  let run=true; //variable que indica si corre el tiempo o no (a false cuando incremento=0)
  let MvMatrix=null,
      PMatrix=null;
  let uMvMatrix=null, uPMatrix;

      
      
/********************* 0. UTILIDADES **************************************/ 
  /******   FunCiones de inicialización de matrices  ********* */

      function inicializarMatrices(){
      	MvMatrix=mat4.create();
      	PMatrix=mat4.create();

        mat4.identity(MvMatrix);
        mat4.identity(PMatrix);
        //mat4.lookAt([0,0.0,1.0],[0,0.0,0],[0,1,0],MvMatrix);
        //mat4.perspective(fovy=120, aspect=1, near=0.1, far=100, PMatrix)
        //console.log(PMatrix)
      }
/*********************** RATON Y TECLADO: Funciones de control del Movimiento y Rotación***/
	/* Deteccion de eventos*/

      function deteccionEventos(){
      	canvas.onmousedown=pulsaRatonAbajo;
      	document.onmouseup=pulsaRatonArriba;
      	document.onmousemove=mueveRaton;
      
      }
     /* Gestion de ventos*/

     function pulsaRatonAbajo(event) {
        ratonAbajo = true;
        posRatonX = event.clientX;
        posRatonY = event.clientY;

    }

    function pulsaRatonArriba(event) {
        ratonAbajo = false;
    }

    function mueveRaton(event) {
        if (!ratonAbajo) {
            return;
        }
        let nuevaX = event.clientX;
        let nuevaY = event.clientY;
        let deltaX = nuevaX - posRatonX;
        let deltaY = nuevaY - posRatonY;

        let idMatrix=mat4.create();
        mat4.identity(idMatrix);

        mat4.rotate(idMatrix,degToRad(deltaX/2), [0,1,0]);
        mat4.rotate(idMatrix,degToRad(deltaY/2), [1,0,0]);
        
        mat4.multiply(idMatrix,MvMatrix,MvMatrix);
        posRatonX = nuevaX;
        posRatonY = nuevaY;
    }


    function degToRad(degrees) {
        return degrees * Math.PI / 180;
    }

    


/********************* 1. INIT WEBGL **************************************/ 
function initWebGL()
      {
        canvas = document.getElementById("canvas");         
        gl = canvas.getContext("webgl");
                
        if(gl)
        {
          setupWebGL();
          initShaders();
          deteccionEventos();
          generarFractal();
          setupBuffersRamas();
          drawFrac();
          setupBuffersHojas();
          drawHojas();
          animacion();  
        } 
        else{  
          alert(  "El navegador no soporta WEBGL.");
        }
      }
      /********************* 2.setupWEBGL **************************************/ 
      function setupWebGL()
      {
        //Pone el color de fondo a blanco---para 2d no funciona
        gl.clearColor(1.0, 1.0, 1.0, 1.0);  

        //Crea un viewport del tamaño del canvas
        gl.viewport(0, 0, canvas.width, canvas.height);

        // Modo ON DEPTH
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT); 
        gl.enable(gl.DEPTH_TEST);

        //Inicializarmatrices de movimeinto
        inicializarMatrices();
  
        //gl.enable ACTIVA una serie de caracteristicas tan variadas como:
        // a) Mezcla de colores (pordefecto está activado)
        gl.enable(gl.BLEND);
        // b) CullFace (me desaparecen tres triangulos o no, jugar con el CCW y EL CW)
        //gl.enable(gl.CULL_FACE);

        //Perspectiva

        /* *** 1 ORTOGRAFICA  *****/
        // La proyetccion ortográfica es por defecto.

        
      }
      /********************* 3. INIT SHADER **************************************/ 
      function initShaders()
      {
       // Esta función inicializa los shaders
       
        //1.Obtengo la referencia de los shaders 
        let fs_source = document.getElementById('fragment-shader').innerHTML;
        let vs_source = document.getElementById('vertex-shader').innerHTML;

        //2. Compila los shaders  
        vertexShader = makeShader(vs_source, gl.VERTEX_SHADER);
        fragmentShader = makeShader(fs_source, gl.FRAGMENT_SHADER);
        
          //3. Crea un programa
          glProgram = gl.createProgram();
        
        //4. Adjunta al programa cada shader
          gl.attachShader(glProgram, vertexShader);
          gl.attachShader(glProgram, fragmentShader);
          gl.linkProgram(glProgram);

        if (!gl.getProgramParameter(glProgram, gl.LINK_STATUS)) {
           alert("No se puede inicializar el Programa .");
          }
        
        //5. Usa el programa
        gl.useProgram(glProgram);
      }
     /********************* 3.1. MAKE SHADER **************************************/ 
      function makeShader(src, type)
      {
        //Compila cada  shader
        let shader = gl.createShader(type);
        gl.shaderSource(shader, src);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
              alert("Error de compilación del shader: " + gl.getShaderInfoLog(shader));
          }
        return shader;
      }

      /*Funcion para generar el fractal, solo se llama al principio para obtener el modelo*/
      function generarFractal(){
                         
            t=0; //seteamos el tiempo a 0
            niter=7; //Nº de iteraciones del fractal, con 8 da problemas porque son demasiados pétalos
            var planta=""; //Palabra generada a partir de la gramática 
  
            vertices=[]; //aqui van las ramas
            hojas=[]; // aqui las hojas
            petalos=[]; //aqui los petalos
            colorVertices=[]; //aqui los colores de las ramas (siempre rojo)
            coloresHojas=[]; //aqui los de las hojas
            coloresPetalos=[]; //aqui los de los petalos

            produccion("X",niter); //Iniciamos con la primera produccion respecto al axioma X

            function produccion(letra,n){
                  if(n>0){ //Mientras no hayamos terminado las iteraciones 

                    if(letra=="X"){ //Produccion de una X :-> F[+X]F[-X]F[-X]+X

                        produccion("F",n-1); //Llamas a produccion para las variables con una iteracion menos
                        planta=planta.concat("[+"); //Concatenas los simbolos terminales (no tienen producciones)
                        produccion("X",n-1);
                        planta=planta.concat("]");
                        produccion("F",n-1);
                        planta=planta.concat("[-");
                        produccion("X",n-1);
                        planta=planta.concat("]");
                        produccion("F",n-1);
                        planta=planta.concat("[-");
                        produccion("X",n-1);
                        planta=planta.concat("]+");
                        produccion("X",n-1);

                    }else if(letra=="F"){ //Produccion de una F:->FF 
                        produccion("F",n-1);
                        produccion("F",n-1);
                    }
                  }else{ //Si es una iteracion final, concatenamos la letra
                      planta=planta.concat(letra);
                  }
                }

            
            console.log(planta)

            
            x=-0.5; //Coordenadas de la raiz
            y=-0.5;
            z=0;


            a1=35*Math.PI/180; //Angulo de giro respecto a la tortuga en U
            a2=40*Math.PI/180; //Angulo de giro respecto a la tortuga en L


            profundidad=1; //Profundidad en la que nos encontramos del arbol, para regular la longitud de las ramas

            //Hocico de la tortuga inicial
            hocico=mat4.create([0,1,0,0,//H
                                1,0,0,0,//L
                                0,0,1,0,//U
                                0,0,0,1])
           
            //Pilas de posiciones y hocicos para cuando entremos en una subrama, al terminar hay que rescatarlas
            var savex=[];
            var savey=[];
            var savez=[];
            var savehocico=[];
            

            //Recorremos la planta (palabra)
            for(k=0;k<planta.length;k++){
              letra=planta[k]; //para cada simbolo que vayamos encontrando

              if(letra=="F" ){ //Una F indica pintar hacia donde marque el hocico
                pf=dibujaF(x,y,z,hocico);
                x=pf[0];y=pf[1];z=pf[2];
                
              }else if(letra=="["){ //Indica que entramos en una (sub)rama
                //Guardo la x y
               
                profundidad+=1;
                savex.push(x);savey.push(y);savez.push(z);    
                savehocico.push([...hocico]);
                
              }else if(letra=="]"){ //Indica que salimos de una rama
                //La recupero
                profundidad-=1;
                x=savex.pop();y=savey.pop();z=savez.pop();
                hocico=[...savehocico.pop()];
                
              }else if(letra=="+"){ //Un + indica rotar el hocico con a1 respecto al vector U del hocico y con a2 en L
                mat4.rotate(hocico,a1,getAxis(hocico,"U"),hocico);
                mat4.rotate(hocico,a2,getAxis(hocico,"L"),hocico);
              }else if(letra=="-"){ //Un - indica rotar el hocico con -a1 en U y con -a2 respecto al vector L del hocico
                mat4.rotate(hocico,-a1,getAxis(hocico,"U"),hocico);
                mat4.rotate(hocico,-a2,getAxis(hocico,"L"),hocico);
              }else if(letra=="X"){ //Una x indica generar una hoja/petalos
                  hojaRandom(x,y,z,hojas);
              }
            }

            
            //funcion de dibujo cuando leemos una F
            function dibujaF(x0,y0,z0,hocico){
                l=0.015+0.015**(profundidad); //longitud de la rama en funcion de la profundidad
                l/=niter; //tratando de regular para que si se cambian las iteraciones la rama se reduzca
                h=getAxis(hocico,"H"); //obtenemos la direccion de dibujo que es el eje H de la tortuga del hocico
                xf=x0+h[0]*l;
                yf=y0+h[1]*l;
                zf=z0+h[2]*l;


                vertices.push(x0,y0,z0,xf,yf,zf); //añadimos los puntos del nuevo segmento y los colores, 
                //aclarando las ramas segun sube la profundidad (ramas altas más blancas y bajas más rojas)
                colorVertices.push(0.372+0.6**(niter-profundidad),0.137+0.6**(niter-profundidad),0.168+0.6**(niter-profundidad),
                                   0.949+0.6**(niter-profundidad),0.796+0.6**(niter-profundidad),0.815+0.6**(niter-profundidad));
                
                return([xf,yf,zf]);
            }

            

      }

      //Añade hojas con un pequeño jitter para dar efecto de esponjosidad a las hojas
      function hojaRandom(x,y,z,hojas){
                a=(Math.random()-0.5)*0.025;
                b=(Math.random()-0.5)*0.025;
                c=(Math.random()-0.5)*0.025;
                petalos.push(x+b,y+c,z+a); //petalo un poquito desplazado con su color aleatorio entre marron y blanco
                coloresPetalos.push(1,0.8+Math.random()*0.2,0.8+Math.random()*0.2);


                //Añado con una probabilidad del 10% un petalo que flotará con el viento 
                anadircaido=Math.random()>0.9;
                if(anadircaido){
                    petalos.push(x+b,y+c,z+a);
                    coloresPetalos.push(1,0.8+Math.random()*0.2,0.8+Math.random()*0.2);
                }

                //añado muchas hojas para dar aspecto frondoso y "algodonado"
                hojas.push(x,y,z,
                           x+a,y+b,z+c,
                           x-a,y-b,z+c,
                           x+a,y+b,z+c,
                           x-a,y-b,z+c,
                           x,y+2*b,z+c)
                
         
      }

      //funcion que nos devuelve un eje del hocico actual de la tortuga
      function getAxis(hocico,AXIS){
          if(AXIS=="H"){
              return(hocico.slice(0,3))
          }else if(AXIS=="L"){
            return(hocico.slice(4,7))
          }else if(AXIS=="U"){
            return(hocico.slice(8,11))
          }
      }

    
/********************* 4 SETUP BUFFERS  **************************************/ 


//buffers de ramas
function setupBuffersRamas(){  
     

        // Buffer que almacena los vértices
        verticeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, verticeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW); 
      

        /* 
        **BUFFER PARA ATRIBUTO POSICION DE VERTICES
        */
        //Busca dónde debe ir la posicion de los vértices en el programa.
        positionLocatAttrib = gl.getAttribLocation(glProgram, "aVertexPosition");
        gl.enableVertexAttribArray(positionLocatAttrib);
        //Enlazo con las posiciones de los vértices
        gl.bindBuffer(gl.ARRAY_BUFFER, verticeBuffer);
        gl.vertexAttribPointer(positionLocatAttrib, 3, gl.FLOAT, false, 0, 0);

        // Buffer Colores
        bufferColores = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferColores);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorVertices), gl.STATIC_DRAW); 

        // Localiza la matriz en el glProgram
        uMvMatrix = gl.getUniformLocation(glProgram, 'uMvMatrix');
        // Localiza la matriz en el glProgram
        uPMatrix = gl.getUniformLocation(glProgram, 'uPMatrix');

      } //de la funcion   

//buffers de hojas
function setupBuffersHojas(){
     // Buffer que almacena los vértices
        hojaBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, hojaBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(hojas), gl.STATIC_DRAW); 
           
        /* 
        **BUFFER PARA ATRIBUTO POSICION DE hojaS
        */
        //Busca dónde debe ir la posicion de los vértices en el programa.
        positionLocatAttrib = gl.getAttribLocation(glProgram, "aVertexPosition");
        gl.enableVertexAttribArray(positionLocatAttrib);
        //Enlazo con las posiciones de los vértices
        gl.bindBuffer(gl.ARRAY_BUFFER, hojaBuffer);
        gl.vertexAttribPointer(positionLocatAttrib, 3, gl.FLOAT, false, 0, 0);

        // Buffer Colores
        coloresHojas=[];
        for(i=0;i<hojas.length/3;i++){
           coloresHojas.push(0.9,0.8,0.8)
        }
        bufferColores = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferColores);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coloresHojas), gl.STATIC_DRAW); 

        // Localiza la matriz en el glProgram
        uMvMatrix = gl.getUniformLocation(glProgram, 'uMvMatrix');
        // Localiza la matriz en el glProgram
        uPMatrix = gl.getUniformLocation(glProgram, 'uPMatrix');

}
//buffers de petalos (se settean en funcion del original+ f(t) que marca el desplazamiento)
function setupBuffersPetalos(t){
     // Buffer que almacena los vértices
        
        
        //Los math.random añaden sensacion de aleatoriedad por el vuelo y el seno ondulacion
        for(i=0;i<petalos.length;i+=3*10){
            petalos[i]=petalos[i]+(t+Math.random()*0.01-0.005)*run;
            petalos[i+1]=petalos[i+1]+((Math.random()*0.01-0.005)+-Math.sin(t*1000)*0.0001-98*t**2)*run; 
            petalos[i+2]=petalos[i+2]+(t+Math.random()*0.01-0.005)*run;
            
        }



        petaloBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, petaloBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(petalos), gl.STATIC_DRAW); 
           
        /* 
        **BUFFER PARA ATRIBUTO POSICION DE petaloS
        */
        //Busca dónde debe ir la posicion de los vértices en el programa.
        positionLocatAttrib = gl.getAttribLocation(glProgram, "aVertexPosition");
        gl.enableVertexAttribArray(positionLocatAttrib);
        //Enlazo con las posiciones de los vértices
        gl.bindBuffer(gl.ARRAY_BUFFER, petaloBuffer);
        gl.vertexAttribPointer(positionLocatAttrib, 3, gl.FLOAT, false, 0, 0);

        // Buffer Colores
        
        bufferColores = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferColores);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coloresPetalos), gl.STATIC_DRAW); 

        // Localiza la matriz en el glProgram
        uMvMatrix = gl.getUniformLocation(glProgram, 'uMvMatrix');
        // Localiza la matriz en el glProgram
        uPMatrix = gl.getUniformLocation(glProgram, 'uPMatrix');

}

/********************FUNCIONES DE DIBUJO**************************/

//dibuja las ramas
function drawFrac(){
        
        gl.uniformMatrix4fv(uMvMatrix, false, MvMatrix);
        gl.uniformMatrix4fv(uPMatrix, false, PMatrix);
        
        colorLocatAttrib = gl.getAttribLocation(glProgram, "aVertexColor");
        gl.enableVertexAttribArray(colorLocatAttrib);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferColores);
        gl.vertexAttribPointer(colorLocatAttrib, 3, gl.FLOAT, false, 0, 0);
        // Dibuja las ramas
        gl.drawArrays(gl.LINES, 0, vertices.length/3);

        
    }//de la funcion


//dibuja las hojas
function drawHojas(){
        gl.uniformMatrix4fv(uMvMatrix, false, MvMatrix);
        gl.uniformMatrix4fv(uPMatrix, false, PMatrix);

        colorLocatAttrib = gl.getAttribLocation(glProgram, "aVertexColor");
        gl.enableVertexAttribArray(colorLocatAttrib);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferColores);
        gl.vertexAttribPointer(colorLocatAttrib, 3, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES,0,hojas.length/3);
}

//dibuja los petalos
function drawPetalos(){
        gl.uniformMatrix4fv(uMvMatrix, false, MvMatrix);
        gl.uniformMatrix4fv(uPMatrix, false, PMatrix);

        colorLocatAttrib = gl.getAttribLocation(glProgram, "aVertexColor");
        gl.enableVertexAttribArray(colorLocatAttrib);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferColores);
        gl.vertexAttribPointer(colorLocatAttrib, 3, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.POINTS,0,petalos.length/3);
  }

//funcion que va generando frames
function animacion(){
        t+=incrementot;//incrementamos el tiempo segun marque incremento
       
      
        setupBuffersRamas();
        drawFrac();
        setupBuffersHojas();
        if(dibujahojas){drawHojas();} //según el flag indica, se pintan o no
        setupBuffersPetalos(t);//según el flag indica, se pintan o no
        if(dibujapetalos){drawPetalos();}
        requestAnimationFrame(animacion);
    }


/*******************************Funciones de control*****************/

//desactiva el pintado de petalos
function togglePetalos(){
      dibujapetalos=!dibujapetalos;
    }

//desactiva el pintado de hojas
function toggleHojas(){
      dibujahojas=!dibujahojas;
    }
//cambia la velocidad segun el slider
function changeSpeed(){
  
      incrementot=0.0000025*document.getElementById("sliderT").value/10;
      if(incrementot==0) run=false; //si el incremento es 0, pone el flag run a 0 para quitar tambien la aleatoriedad del movimiento
      else run=true;
}


</script>
<!-- ****************   VERTEX SHADER *******************-->
<script id="vertex-shader" type="x-shader/x-vertex">

  attribute vec3 aVertexPosition;
  attribute vec3 aVertexColor;

  varying highp vec4 vColor;
//Matriz de trasnformación
 uniform mat4 uMvMatrix;
 uniform mat4 uPMatrix;

void main() {
  
 
  //AHORA transformo las coordenadas
   gl_Position= uPMatrix*uMvMatrix*vec4(aVertexPosition,1.0);
   //gl_Position= vec4(aVertexPosition,1.0);
   gl_PointSize=4.0; //TAMAÑO DEL PUNTO

   vColor= vec4(aVertexColor,1.0);
   
}
</script>
<!-- ****************   FRAGMENT SHADER *******************-->
<script id="fragment-shader" type="x-shader/x-fragment">
//uniform vec4 uColor;
varying  highp vec4 vColor;
void main() {
  //Color rojo
   gl_FragColor =vColor;
}