--functions called in the code used in the examples
needsPackage("MultiprojectiveVarieties")
needsPackage("Elimination")
needsPackage("Quasidegrees")

computeToricLC = method()
computeToricLC(Matrix) := Ideal => A -> (
    p := local p;
    u := local u;
    numcol := local numcol;
    M := local M;
    numcol = numColumns(A);
    R := ZZ/32003[p_1..p_numcol, u_1..u_numcol, Degrees => {numcol:{1,0}, numcol:{0,1}}];
    toric := toricIdeal(A,R);
    M = reshape(R^numcol,R^2,matrix({gens R}));
    I := toric+minors(2,A*M);
    L := saturate(I,sum entries M_0);
    L)

computeLC = method()
computeLC(Ideal) := Ideal => I -> (
    U := local U;
    d := local d;
    u := local u;
    pmat := local pmat;
    umat := local umat;
    R := ring(I);
    n := numgens R;
    S := coefficientRing(R)[gens R, u_1..u_n];
    varList := for i from 0 to #(gens R) -1 list S_i;
    varList2 := for i from 0 to #(gens R) -1 list 1_S;
    f := map(S,R,varList);
    J := (matrix {varList2}) || transpose(f jacobian(I));
    Q := minors(codim(I)+1,jacobian(I));

    U = reshape(S^n,S^2,matrix{gens S});
    pmat = transpose(matrix{U_0});
    umat = transpose(matrix{U_1});
    Jaug := umat || J*diagonalMatrix(varList);

    H := ideal((sum flatten entries pmat)*(product flatten entries pmat));

    L := saturate(f(I) + minors(codim(I)+2,Jaug),H+(f(Q)));
    L)

computenwayIndependenceLC = method()
computenwayIndependenceLC(List) := Ideal => inplist -> (
    p := local p;
    u := local u;
    curM := local curM;
    curu := local curu;
    currow := local currow;
    inplist = new Sequence from inplist;
    ilist := new List from inplist;
    nums := for i from 0 to #inplist-1 list fold((n,m)->n*m, ilist)/ilist_i;
    fixListsEnding := for i from 1 to #inplist list (
        if i == 1 then (
        for j from 1 to inplist_(i-1) list (1:j)| new Sequence from inplist_{1 ..#inplist-1}
        );
        if i == #inplist then (
        for j from 1 to inplist_(i-1) list (new Sequence from inplist_{0 ..#inplist-2}) | (1:j)
        );
        for j from 1 to inplist_(i-1) list (new Sequence from inplist_{0 ..i-2}) |(1:j)| (new Sequence from inplist_{i..#inplist-1})
    );

    fixListsStart := for i from 1 to #inplist list (
        if i == 1 then (
        for j from 1 to inplist_(i-1) list (1:j)| (#inplist-1 : 1)
        );
        if i == #inplist then (
        for j from 1 to inplist_(i-1) list (#inplist-1:1) | (1:j)
        );
        for j from 1 to inplist_(i-1) list (i-1:1) |(1:j)| (#inplist-i:1)
    );
    deglist1 := fold((n,m)->n*m,ilist) : {1,0};
    deglist2 := fold((n,m)->n*m,ilist) : {0,1};
    deglist := new List from join(deglist1,deglist2);
    start := #inplist:1;
    R := ZZ/32003[p_start..p_inplist,u_start..u_inplist, Degrees => deglist];
    Ms := {};
    for i from 0 to #inplist-1 do (
        curM = {};
        for j from 0 to #fixListsStart_i-1 do(
                currow = new List from p_(fixListsStart_i_j)..p_(fixListsEnding_i_j);
            curu = sum new List from u_(fixListsStart_i_j)..u_(fixListsEnding_i_j);
            currow = append(currow,curu);
            curM = append(curM,currow);
        );
        Ms = append(Ms,matrix curM)
        );  
    Ilist := for i from 0 to #Ms-1 list minors(2,Ms_i);
    I := sum Ilist;
I)


computenwayindependenceModel = method()
computenwayindependenceModel(List) := Ideal => inplist -> (
    p := local p;
    u := local u;
    curM := local curM;
    curu := local curu;
    currow := local currow;
    inplist = new Sequence from inplist;
    ilist := new List from inplist;
    nums := for i from 0 to #inplist-1 list fold((n,m)->n*m, ilist)/ilist_i;
    fixListsEnding := for i from 1 to #inplist list (
        if i == 1 then (
        for j from 1 to inplist_(i-1) list (1:j)| new Sequence from inplist_{1 ..#inplist-1}
        );
        if i == #inplist then (
        for j from 1 to inplist_(i-1) list (new Sequence from inplist_{0 ..#inplist-2}) | (1:j)
        );
        for j from 1 to inplist_(i-1) list (new Sequence from inplist_{0 ..i-2}) |(1:j)| (new Sequence from inplist_{i..#inplist-1})
    );

    fixListsStart := for i from 1 to #inplist list (
        if i == 1 then (
        for j from 1 to inplist_(i-1) list (1:j)| (#inplist-1 : 1)
        );
        if i == #inplist then (
        for j from 1 to inplist_(i-1) list (#inplist-1:1) | (1:j)
        );
        for j from 1 to inplist_(i-1) list (i-1:1) |(1:j)| (#inplist-i:1)
    );
    deglist1 := fold((n,m)->n*m,ilist) : {1,0};
    deglist2 := fold((n,m)->n*m,ilist) : {0,1};
    deglist := new List from join(deglist1,deglist2);
    start := #inplist:1;
    R := ZZ/32003[p_start..p_inplist,u_start..u_inplist, Degrees => deglist];
    Ms := {};
    for i from 0 to #inplist-1 do (
        curM = {};
        for j from 0 to #fixListsStart_i-1 do(
                currow = new List from p_(fixListsStart_i_j)..p_(fixListsEnding_i_j);
            curM = append(curM,currow);
        );
        Ms = append(Ms,matrix curM)
        );
    Ilist := for i from 0 to #Ms-1 list minors(2,Ms_i);
    I := sum Ilist;
I)

computenwayToricMatrix = method()
computenwayToricMatrix(List) := Ideal => inplist -> (
    p := local p;
    u := local u;
    currow := local currow;
    curM := local curM;
    curu := local curu;
    --currow := local currow;
    inplist = new Sequence from inplist;
    start := #inplist:1;
    theSeq := start .. inplist;
    ilist := new List from inplist;
    nums := fold((n,m)->n*m, ilist);
    firstRow := new List from (nums:1);
    AMatrix := {firstRow};
    for i from 0 to #inplist-1 do (
        for j from 1 to inplist_i-1 do (
            currow = {};
            for k in theSeq list (
                if k_i == inplist_i then (
                    currow = append(currow, 1);
                    continue;
                );
                currow = append(currow, 0);
            );
        );
        AMatrix = append(AMatrix,currow);
    );
matrix AMatrix)

nwayindependenceMatrices = method()
nwayindependenceMatrices(List) := List => inplist -> (
    p := local p;
    u := local u;
    curM := local curM;
    curu := local curu;
    currow := local currow;
    inplist = new Sequence from inplist;
    ilist := new List from inplist;
    nums := for i from 0 to #inplist-1 list fold((n,m)->n*m, ilist)/ilist_i;
    fixListsEnding := for i from 1 to #inplist list (
        if i == 1 then (
        for j from 1 to inplist_(i-1) list (1:j)| new Sequence from inplist_{1 ..#inplist-1}
        );
        if i == #inplist then (
        for j from 1 to inplist_(i-1) list (new Sequence from inplist_{0 ..#inplist-2}) | (1:j)
        );
        for j from 1 to inplist_(i-1) list (new Sequence from inplist_{0 ..i-2}) |(1:j)| (new Sequence from inplist_{i..#inplist-1})
    );

    fixListsStart := for i from 1 to #inplist list (
        if i == 1 then (
        for j from 1 to inplist_(i-1) list (1:j)| (#inplist-1 : 1)
        );
        if i == #inplist then (
        for j from 1 to inplist_(i-1) list (#inplist-1:1) | (1:j)
        );
        for j from 1 to inplist_(i-1) list (i-1:1) |(1:j)| (#inplist-i:1)
    );
    deglist1 := fold((n,m)->n*m,ilist) : {1,0};
    deglist2 := fold((n,m)->n*m,ilist) : {0,1};
    deglist := new List from join(deglist1,deglist2);
    start := #inplist:1;
    R := ZZ/32003[p_start..p_inplist,u_start..u_inplist, Degrees => deglist];
    Ms := {};
    for i from 0 to #inplist-1 do (
        curM = {};
        for j from 0 to #fixListsStart_i-1 do(
                currow = new List from p_(fixListsStart_i_j)..p_(fixListsEnding_i_j);
            curu = sum new List from u_(fixListsStart_i_j)..u_(fixListsEnding_i_j);
            currow = append(currow,curu);
            curM = append(curM,currow);
        );
        Ms = append(Ms,matrix curM)
        );  
Ms)



--Code for Example 4.4

--note here that we are not checking if the ToricLC is prime, this would increase the runtime.

--using our method
L = for i from 2 to 6 list for j from 2 to 6 list (timing computenwayIndependenceLC({i,j}))
timesOut = for i from 0 to 4 list for j from 0 to 4 list L_i_j#0
tab = Table(timesOut)
tex(tab)


--using toric method
L = for i from 2 to 6 list for j from 2 to 6 list (timing computeToricLC(computenwayToricMatrix({i,j})))
timesOut = for i from 0 to 4 list for j from 0 to 4 list L_i_j#0
tab = Table(timesOut)
tex(tab)

---using typical method
L = for i from 2 to 2 list for j from 2 to 2 list (timing computeLC(computenwayindependenceModel({i,j})))
timesOut = for i from 0 to 0 list for j from 0 to 0 list L_i_j#0
tab = Table(timesOut)
tex(tab)

--using our method
L = for i from 2 to 6 list for j from 2 to 6 list (timing computenwayIndependenceLC({2,i,j}))
timesOut = for i from 0 to 4 list for j from 0 to 4 list L_i_j#0
tab = Table(timesOut)
tex(tab)


--using toric method
L = for i from 2 to 6 list for j from 2 to 6 list (timing computeToricLC(computenwayToricMatrix({2,i,j})))
timesOut = for i from 0 to 4 list for j from 0 to 4 list L_i_j#0
tab = Table(timesOut)
tex(tab)

---using typical method would not recommend running this as it takes a long time
--L = for i from 2 to 2 list for j from 2 to 2 list (timing computeLC(computenwayindependenceModel({2,i,j})))
--timesOut = for i from 0 to 0 list for j from 0 to 0 list L_i_j#0
--tab = Table(timesOut)
--tex(tab)




--Code for Example 4.5: by joint independence you can just treat X2 and X3 as a single new variable Y with 12 possible outcomes
Matrices = nwayindependenceMatrices({2,12}) 

--Code for Example 4.6: 

----toymodel X-Y-Z try it using what we know about TV (make sure only tv stuff shows up by breaking up matrices)
---trying again using Daves Multiplication (1,2), (1,3), (2,3)... no idea what is going on here
A1 = matrix{{1,1,0,0,0,0,0,0},{0,0,1,1,0,0,0,0},{0,0,0,0,1,1,0,0},{0,0,0,0,0,0,1,1}}
A2 = matrix{{1,0,0,0,1,0,0,0},{0,1,0,0,0,1,0,0},{0,0,1,0,0,0,1,0},{0,0,0,1,0,0,0,1}}
A = A1 || A2
I1 = computeToricLC(A) --generate the ideal using the toric method
isPrime I1 -- confirm that the ideal is prime and therefore is the Likelihood ideal
R = ring(I1)
use R
v = vars R

--short rutine we use to make the matrices more or less converts rows of A into rows of a contingency table
build = {}
vectmaker = for i from 0 to numRows(A)-1 do(
    buildc = {};
    for j from 0 to numColumns(A)-1 do if A_j_i == 1 then buildc = append(buildc,v_j_0);
    sumem = {};
    for j from 0 to numColumns(A)-1 do if A_j_i == 1 then sumem = append(sumem,v_(j+numColumns(A))_0);
    buildc = append(buildc, sum(sumem));
    build = append(build,buildc);
) 
--Orginal Clique matrices
M1 = matrix{build_0,build_1,build_2,build_3}
M2 = matrix{build_4,build_5,build_6,build_7}

--Break them up by the different choices of X_2 for which both are dependent
Ma11 = matrix{build_0,build_2}
Ma12 = matrix{build_1,build_3}
Ma21 = matrix{build_4,build_5}
Ma22 = matrix{build_6,build_7}
--Now we need to add the extra generators which come from the toric method
S1a =  {{v_4_0+v_5_0,v_12_0+v_13_0},{v_1_0+v_5_0, v_9_0+v_13_0},{v_0_0+v_1_0, v_8_0+v_9_0}}
S2a =  {{v_6_0+v_7_0,v_14_0+v_15_0},{v_3_0+v_7_0, v_11_0+v_15_0},{v_2_0+v_6_0, v_10_0+v_14_0}}
EJa = for i from 0 to #S1a-1 list for j from 0 to #S1a-1 list S1a_i_0*S2a_j_1 - S1a_i_1*S2a_j_0
EJJa = flatten(EJa)

--Combine the minors of those 4 matrices with the extra generators
I2 = minors(2,Ma11) + minors(2,Ma12) + minors(2,Ma21) + minors(2,Ma22)--- + minors(2,Mb11) + minors(2,Mb12)+ minors(2,Mb21) + minors(2,Mb22) + minors(2,Mc11) + minors(2,Mc12)+ minors(2,Mc21) + minors(2,Mc22) + ideal(EJJa) + ideal(EJJb) + ideal(EJJc)   --+minors(2,M4) + minors(2,M5) + minors(2,M6) -- + minors(2,M4) --+minors(2,M13)+ minors(2,M23)
I2 = I2 + ideal(EJJa) 
I1 == I2 


--Code for Example 4.7:
A = matrix{{1,1,0,0,0,0,0,0},{0,0,1,1,0,0,0,0},{0,0,0,0,1,1,0,0},{0,0,0,0,0,0,1,1},{1,0,0,0,1,0,0,0},{0,1,0,0,0,1,0,0},{0,0,1,0,0,0,1,0},{0,0,0,1,0,0,0,1},{1,0,1,0,0,0,0,0},{0,1,0,1,0,0,0,0},{0,0,0,0,1,0,1,0},{0,0,0,0,0,1,0,1}}
I1 = computeToricLC(A) --generate the ideal using the toric method
isPrime I1 -- confirm that the ideal is prime and therefore is the Likelihood ideal 
--next we build I2 which is just I(A) + I_2(AM)
R = ring(I1)
use R;
M = reshape(R^(numColumns(A)),R^2,matrix({gens R}));
I2 = toricIdeal(A,R) + minors(2,A*M)

isSubset(I2,I1) --confirm that I2 is a subset of I1
isSubset(I1,I2) --As we see I1 is not contained in I2
I1 == I2 -- indeed they are not equal


--Let us see what additional generators are introduced during saturation
K1 = gens I1

extraGens = for i from 0 to rank source K1 -1 list K1_i_0 % I2
extraGens = for i from 0 to #extraGens-1 list if extraGens_i != 0 then extraGens_i else continue
#extraGens -- just one extra generator
extraGens_0 -- as we see it is a single quartic which can be rewritten in the form presented in Example 4.7 of the paper.